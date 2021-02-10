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
  V1ClusterRoleBinding,
  RbacAuthorizationV1Api,
  V1Status,
  KubeConfig,
  Watch
} from "@kubernetes/client-node";
import { K8sResource, isSameObject, ResourceCache } from "../common";
import { IncomingMessage } from "http";
import { log } from "@opstrace/utils";

export type ClusterRoleBindingType = ClusterRoleBinding;
export type ClusterRoleBindings = ClusterRoleBindingType[];

export const isClusterRoleBinding = <
  (r: K8sResource) => r is ClusterRoleBindingType
>(resource => resource instanceof ClusterRoleBinding);

export const clusterRoleBindingActions = {
  fetch: createAsyncAction(
    "FETCH_K8S_CLUSTER_ROLE_BINDINGS_REQUEST",
    "FETCH_K8S_CLUSTER_ROLE_BINDINGS_SUCCESS",
    "FETCH_K8S_CLUSTER_ROLE_BINDINGS_FAILURE"
  )<
    Record<string, unknown>,
    { resources: ClusterRoleBindings },
    { error: Error }
  >(),
  onUpdated: createAction("ON_UPDATED_K8S_CLUSTER_ROLE_BINDINGS")<
    ClusterRoleBindingType
  >(),
  onAdded: createAction("ON_ADDED_K8S_CLUSTER_ROLE_BINDINGS")<
    ClusterRoleBindingType
  >(),
  onDestroyed: createAction("ON_DESTROYED_K8S_CLUSTER_ROLE_BINDINGS")<
    ClusterRoleBindingType
  >()
};
export type ClusterRoleBindingActions = ActionType<
  typeof clusterRoleBindingActions
>;
export type ClusterRoleBindingState = ResourceCache<ClusterRoleBindingType>;

const initialState: ClusterRoleBindingState = {
  loaded: false,
  error: null,
  resources: []
};

export const clusterRoleBindingsReducer = createReducer<
  ClusterRoleBindingState,
  ClusterRoleBindingActions
>(initialState)
  .handleAction(
    clusterRoleBindingActions.fetch.request,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (state, _): ClusterRoleBindingState => ({
      ...state,
      loaded: false
    })
  )
  .handleAction(
    clusterRoleBindingActions.fetch.success,
    (state, action): ClusterRoleBindingState => ({
      ...state,
      ...action.payload,
      error: null,
      loaded: true
    })
  )
  .handleAction(
    clusterRoleBindingActions.fetch.failure,
    (state, action): ClusterRoleBindingState => ({
      ...state,
      ...action.payload,
      loaded: false
    })
  )
  .handleAction(
    [clusterRoleBindingActions.onUpdated, clusterRoleBindingActions.onAdded],
    (state, action): ClusterRoleBindingState => ({
      ...state,
      resources: [
        ...state.resources.filter(s => !isSameObject(s, action.payload)),
        action.payload
      ]
    })
  )
  .handleAction(
    clusterRoleBindingActions.onDestroyed,
    (state, action): ClusterRoleBindingState => ({
      ...state,
      resources: state.resources.filter(s => !isSameObject(s, action.payload))
    })
  );

export class ClusterRoleBinding extends K8sResource {
  protected api: RbacAuthorizationV1Api;
  protected resource: V1ClusterRoleBinding;

  constructor(resource: V1ClusterRoleBinding, kubeConfig: KubeConfig) {
    super(resource, kubeConfig);

    this.resource = resource;
    this.api = kubeConfig.makeApiClient(RbacAuthorizationV1Api);
  }
  get spec(): V1ClusterRoleBinding {
    return this.resource;
  }
  get namespace(): string {
    return "default";
  }
  static startInformer(
    kubeConfig: KubeConfig,
    channel: (input: unknown) => void
  ): () => void {
    const client = kubeConfig.makeApiClient(RbacAuthorizationV1Api);
    let cancelled = false;
    let request: Request;
    const watch = async () => {
      if (cancelled) {
        return;
      }
      try {
        const res = await client.listClusterRoleBinding();
        channel(
          clusterRoleBindingActions.fetch.success({
            resources: res.body.items.map(
              r => new ClusterRoleBinding(r, kubeConfig)
            )
          })
        );
      } catch (error) {
        channel(clusterRoleBindingActions.fetch.failure({ error }));
        log.warning("starting informer failed (will retry):  %s", error);
        return setTimeout(watch, 3000);
      }
      const informer = new Watch(kubeConfig);
      const watchHandler = (phase: string, obj: V1ClusterRoleBinding) => {
        switch (phase) {
          case "ADDED":
            channel(
              clusterRoleBindingActions.onAdded(
                new ClusterRoleBinding(obj, kubeConfig)
              )
            );
            break;
          case "MODIFIED":
            channel(
              clusterRoleBindingActions.onUpdated(
                new ClusterRoleBinding(obj, kubeConfig)
              )
            );
            break;
          case "DELETED":
            channel(
              clusterRoleBindingActions.onDestroyed(
                new ClusterRoleBinding(obj, kubeConfig)
              )
            );
            break;
        }
      };
      request = await informer.watch(
        "/apis/rbac.authorization.k8s.io/v1/clusterrolebindings",
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
    body: V1ClusterRoleBinding;
  }> {
    return this.api.createClusterRoleBinding(this.resource);
  }
  read(): Promise<{
    response: IncomingMessage;
    body: V1ClusterRoleBinding;
  }> {
    return this.api.readClusterRoleBinding(this.name);
  }
  update(): Promise<{
    response: IncomingMessage;
    body: V1ClusterRoleBinding;
  }> {
    return this.api.patchClusterRoleBinding(
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
    return this.api.deleteClusterRoleBinding(this.name);
  }
}
