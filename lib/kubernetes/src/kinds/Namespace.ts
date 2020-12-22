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
  CoreV1Api,
  V1Status,
  V1Namespace,
  Watch,
  KubeConfig
} from "@kubernetes/client-node";
import { K8sResource, isSameObject, ResourceCache } from "../common";
import { IncomingMessage } from "http";
import { log } from "@opstrace/utils";
export type NamespaceType = Namespace;
export type Namespaces = NamespaceType[];

export const isNamespace = <(r: K8sResource) => r is NamespaceType>(
  (resource => resource instanceof Namespace)
);

export const namespaceActions = {
  fetch: createAsyncAction(
    "FETCH_K8S_NAMESPACES_REQUEST",
    "FETCH_K8S_NAMESPACES_SUCCESS",
    "FETCH_K8S_NAMESPACES_FAILURE"
  )<Record<string, unknown>, { resources: Namespaces }, { error: Error }>(),
  onUpdated: createAction("ON_UPDATED_K8S_NAMESPACE")<NamespaceType>(),
  onAdded: createAction("ON_ADDED_K8S_NAMESPACE")<NamespaceType>(),
  onDestroyed: createAction("ON_DESTROYED_K8S_NAMESPACE")<NamespaceType>()
};
export type NamespaceActions = ActionType<typeof namespaceActions>;
export type NamespaceState = ResourceCache<NamespaceType>;

const initialState: NamespaceState = {
  loaded: false,
  error: null,
  resources: []
};

export const namespacesReducer = createReducer<
  NamespaceState,
  NamespaceActions
>(initialState)
  .handleAction(
    namespaceActions.fetch.request,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (state, _): NamespaceState => ({
      ...state,
      loaded: false
    })
  )
  .handleAction(
    namespaceActions.fetch.success,
    (state, action): NamespaceState => ({
      ...state,
      ...action.payload,
      error: null,
      loaded: true
    })
  )
  .handleAction(
    namespaceActions.fetch.failure,
    (state, action): NamespaceState => ({
      ...state,
      ...action.payload,
      loaded: false
    })
  )
  .handleAction(
    [namespaceActions.onUpdated, namespaceActions.onAdded],
    (state, action): NamespaceState => ({
      ...state,
      resources: [
        ...state.resources.filter(s => !isSameObject(s, action.payload)),
        action.payload
      ]
    })
  )
  .handleAction(
    namespaceActions.onDestroyed,
    (state, action): NamespaceState => ({
      ...state,
      resources: state.resources.filter(s => !isSameObject(s, action.payload))
    })
  );

export class Namespace extends K8sResource {
  protected api: CoreV1Api;
  protected resource: V1Namespace;

  constructor(resource: V1Namespace, kubeConfig: KubeConfig) {
    super(resource, kubeConfig);

    this.resource = resource;
    this.api = kubeConfig.makeApiClient(CoreV1Api);
  }
  get spec(): V1Namespace {
    return this.resource;
  }
  static startInformer(
    kubeConfig: KubeConfig,
    channel: (input: unknown) => void
  ): () => void {
    const client = kubeConfig.makeApiClient(CoreV1Api);
    let cancelled = false;
    let request: Request;
    const watch = async () => {
      if (cancelled) {
        return;
      }
      try {
        const res = await client.listNamespace();
        channel(
          namespaceActions.fetch.success({
            resources: res.body.items.map(r => new Namespace(r, kubeConfig))
          })
        );
      } catch (error) {
        channel(namespaceActions.fetch.failure({ error }));
        log.warning("starting informer failed (will retry):  %s", error);
        return setTimeout(watch, 3000);
      }
      const informer = new Watch(kubeConfig);
      const watchHandler = (phase: string, obj: V1Namespace) => {
        switch (phase) {
          case "ADDED":
            channel(namespaceActions.onAdded(new Namespace(obj, kubeConfig)));
            break;
          case "MODIFIED":
            channel(namespaceActions.onUpdated(new Namespace(obj, kubeConfig)));
            break;
          case "DELETED":
            channel(
              namespaceActions.onDestroyed(new Namespace(obj, kubeConfig))
            );
            break;
        }
      };
      request = await informer.watch(
        "/api/v1/namespaces",
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
    body: V1Namespace;
  }> {
    return this.api.createNamespace(this.resource);
  }
  read(): Promise<{
    response: IncomingMessage;
    body: V1Namespace;
  }> {
    return this.api.readNamespace(this.name);
  }
  update(): Promise<{
    response: IncomingMessage;
    body: V1Namespace;
  }> {
    return this.api.patchNamespace(
      this.name,
      this.resource,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        headers: { "Content-Type": "application/merge-patch+json" }
      }
    );
  }
  delete(): Promise<{
    response: IncomingMessage;
    body: V1Status;
  }> {
    return this.api.deleteNamespace(this.name);
  }
}
