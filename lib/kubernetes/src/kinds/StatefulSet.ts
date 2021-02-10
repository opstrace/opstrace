/**
 * Copyright 2019-2021 Opstrace, Inc.
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
  V1Status,
  AppsV1Api,
  V1StatefulSet,
  KubeConfig,
  Watch
} from "@kubernetes/client-node";
import { K8sResource, isSameObject, ResourceCache, union } from "../common";
import { IncomingMessage } from "http";
import { log } from "@opstrace/utils";

export type StatefulSetType = StatefulSet;
export type StatefulSets = StatefulSetType[];

export const isStatefulSet = <(r: K8sResource) => r is StatefulSetType>(
  (resource => resource instanceof StatefulSet)
);

export const statefulSetActions = {
  fetch: createAsyncAction(
    "FETCH_K8S_STATEFUL_SETS_REQUEST",
    "FETCH_K8S_STATEFUL_SETS_SUCCESS",
    "FETCH_K8S_STATEFUL_SETS_FAILURE"
  )<Record<string, unknown>, { resources: StatefulSets }, { error: Error }>(),
  onUpdated: createAction("ON_UPDATED_K8S_STATEFUL_SETS")<StatefulSetType>(),
  onAdded: createAction("ON_ADDED_K8S_STATEFUL_SETS")<StatefulSetType>(),
  onDestroyed: createAction("ON_DESTROYED_K8S_STATEFUL_SETS")<StatefulSetType>()
};
export type StatefulSetActions = ActionType<typeof statefulSetActions>;
export type StatefulSetState = ResourceCache<StatefulSetType>;

const initialState: StatefulSetState = {
  loaded: false,
  error: null,
  resources: []
};

export const statefulSetsReducer = createReducer<
  StatefulSetState,
  StatefulSetActions
>(initialState)
  .handleAction(
    statefulSetActions.fetch.request,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (state, _): StatefulSetState => ({
      ...state,
      loaded: false
    })
  )
  .handleAction(
    statefulSetActions.fetch.success,
    (state, action): StatefulSetState => ({
      ...state,
      ...action.payload,
      resources: union(state.resources, action.payload.resources),
      error: null,
      loaded: true
    })
  )
  .handleAction(
    statefulSetActions.fetch.failure,
    (state, action): StatefulSetState => ({
      ...state,
      ...action.payload,
      loaded: false
    })
  )
  .handleAction(
    [statefulSetActions.onUpdated, statefulSetActions.onAdded],
    (state, action): StatefulSetState => ({
      ...state,
      resources: [
        ...state.resources.filter(s => !isSameObject(s, action.payload)),
        action.payload
      ]
    })
  )
  .handleAction(
    statefulSetActions.onDestroyed,
    (state, action): StatefulSetState => ({
      ...state,
      resources: state.resources.filter(s => !isSameObject(s, action.payload))
    })
  );

export class StatefulSet extends K8sResource {
  protected api: AppsV1Api;
  protected resource: V1StatefulSet;

  constructor(resource: V1StatefulSet, kubeConfig: KubeConfig) {
    super(resource, kubeConfig);

    this.resource = resource;
    this.api = kubeConfig.makeApiClient(AppsV1Api);
  }
  get spec(): V1StatefulSet {
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
        const res = await client.listStatefulSetForAllNamespaces();
        channel(
          statefulSetActions.fetch.success({
            resources: res.body.items.map(r => new StatefulSet(r, kubeConfig))
          })
        );
      } catch (error) {
        channel(statefulSetActions.fetch.failure({ error }));
        log.warning("starting informer failed (will retry):  %s", error);
        return setTimeout(watch, 3000);
      }
      const informer = new Watch(kubeConfig);
      const watchHandler = (phase: string, obj: V1StatefulSet) => {
        switch (phase) {
          case "ADDED":
            channel(
              statefulSetActions.onAdded(new StatefulSet(obj, kubeConfig))
            );
            break;
          case "MODIFIED":
            channel(
              statefulSetActions.onUpdated(new StatefulSet(obj, kubeConfig))
            );
            break;
          case "DELETED":
            channel(
              statefulSetActions.onDestroyed(new StatefulSet(obj, kubeConfig))
            );
            break;
        }
      };
      request = await informer.watch(
        "/apis/apps/v1/statefulsets",
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
    body: V1StatefulSet;
  }> {
    return this.api.createNamespacedStatefulSet(this.namespace, this.resource);
  }
  read(): Promise<{
    response: IncomingMessage;
    body: V1StatefulSet;
  }> {
    return this.api.readNamespacedStatefulSet(this.name, this.namespace);
  }
  update(): Promise<{
    response: IncomingMessage;
    body: V1StatefulSet;
  }> {
    return this.api.patchNamespacedStatefulSet(
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
    return this.api.deleteNamespacedStatefulSet(this.name, this.namespace);
  }
}
