/**
 * Copyright 2020 Opstrace, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Request } from "request";
import {
  createReducer,
  createAsyncAction,
  ActionType,
  createAction
} from "typesafe-actions";
import {
  AppsV1Api,
  V1Status,
  V1DaemonSet,
  KubeConfig,
  Watch
} from "@kubernetes/client-node";
import { K8sResource, isSameObject, ResourceCache, union } from "../common";
import { IncomingMessage } from "http";
import { log } from "@opstrace/utils";

export type DaemonSetType = DaemonSet;
export type DaemonSets = DaemonSetType[];

export const isDaemonSet = <(r: K8sResource) => r is DaemonSetType>(
  (resource => resource instanceof DaemonSet)
);

export const daemonSetActions = {
  fetch: createAsyncAction(
    "FETCH_K8S_DAEMONSETS_REQUEST",
    "FETCH_K8S_DAEMONSETS_SUCCESS",
    "FETCH_K8S_DAEMONSETS_FAILURE"
  )<Record<string, unknown>, { resources: DaemonSets }, { error: Error }>(),
  onUpdated: createAction("ON_UPDATED_K8S_DAEMONSETS")<DaemonSetType>(),
  onAdded: createAction("ON_ADDED_K8S_DAEMONSETS")<DaemonSetType>(),
  onDestroyed: createAction("ON_DESTROYED_K8S_DAEMONSETS")<DaemonSetType>()
};
export type DaemonSetActions = ActionType<typeof daemonSetActions>;
export type DaemonSetState = ResourceCache<DaemonSetType>;

const initialState: DaemonSetState = {
  loaded: false,
  error: null,
  resources: []
};

export const daemonSetsReducer = createReducer<
  DaemonSetState,
  DaemonSetActions
>(initialState)
  .handleAction(
    daemonSetActions.fetch.request,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (state, _): DaemonSetState => ({
      ...state,
      loaded: false
    })
  )
  .handleAction(
    daemonSetActions.fetch.success,
    (state, action): DaemonSetState => ({
      ...state,
      ...action.payload,
      resources: union(state.resources, action.payload.resources),
      error: null,
      loaded: true
    })
  )
  .handleAction(
    daemonSetActions.fetch.failure,
    (state, action): DaemonSetState => ({
      ...state,
      ...action.payload,
      loaded: false
    })
  )
  .handleAction(
    [daemonSetActions.onUpdated, daemonSetActions.onAdded],
    (state, action): DaemonSetState => ({
      ...state,
      resources: [
        ...state.resources.filter(s => !isSameObject(s, action.payload)),
        action.payload
      ]
    })
  )
  .handleAction(
    daemonSetActions.onDestroyed,
    (state, action): DaemonSetState => ({
      ...state,
      resources: state.resources.filter(s => !isSameObject(s, action.payload))
    })
  );

export class DaemonSet extends K8sResource {
  protected api: AppsV1Api;
  protected resource: V1DaemonSet;

  constructor(resource: V1DaemonSet, kubeConfig: KubeConfig) {
    super(resource, kubeConfig);

    this.resource = resource;
    this.api = kubeConfig.makeApiClient(AppsV1Api);
  }
  get spec(): V1DaemonSet {
    return this.resource;
  }
  static startInformer(
    kubeConfig: KubeConfig,
    channel: (input: unknown) => void
  ): () => void {
    const client = kubeConfig.makeApiClient(AppsV1Api);
    let cancelled = false;
    let request: Request;
    const watch = async () => {
      if (cancelled) {
        return;
      }
      try {
        const res = await client.listDaemonSetForAllNamespaces();
        channel(
          daemonSetActions.fetch.success({
            resources: res.body.items.map(r => new DaemonSet(r, kubeConfig))
          })
        );
      } catch (error) {
        channel(daemonSetActions.fetch.failure({ error }));
        log.warning("starting informer failed (will retry):  %s", error);
        return setTimeout(watch, 3000);
      }
      const informer = new Watch(kubeConfig);
      const watchHandler = (phase: string, obj: V1DaemonSet) => {
        switch (phase) {
          case "ADDED":
            channel(daemonSetActions.onAdded(new DaemonSet(obj, kubeConfig)));
            break;
          case "MODIFIED":
            channel(daemonSetActions.onUpdated(new DaemonSet(obj, kubeConfig)));
            break;
          case "DELETED":
            channel(
              daemonSetActions.onDestroyed(new DaemonSet(obj, kubeConfig))
            );
            break;
        }
      };
      request = await informer.watch(
        "/apis/apps/v1/daemonsets",
        { resourceVersion: undefined },
        watchHandler,
        watch
      );
      return request;
    };
    watch();
    // Return a function to disable the informer and close the request
    return () => {
      cancelled = true;
      request && request.abort();
    };
  }
  create(): Promise<{
    response: IncomingMessage;
    body: V1DaemonSet;
  }> {
    return this.api.createNamespacedDaemonSet(this.namespace, this.resource);
  }
  read(): Promise<{
    response: IncomingMessage;
    body: V1DaemonSet;
  }> {
    return this.api.readNamespacedDaemonSet(this.name, this.namespace);
  }
  update(): Promise<{
    response: IncomingMessage;
    body: V1DaemonSet;
  }> {
    return this.api.patchNamespacedDaemonSet(
      this.name,
      this.namespace,
      this.resource,
      undefined,
      undefined,
      undefined,
      undefined,
      { headers: { "Content-Type": "application/merge-patch+json" } }
    );
  }
  delete(): Promise<{
    response: IncomingMessage;
    body: V1Status;
  }> {
    return this.api.deleteNamespacedDaemonSet(this.name, this.namespace);
  }
}
