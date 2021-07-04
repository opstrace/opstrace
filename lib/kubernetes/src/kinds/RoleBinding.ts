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
  V1RoleBinding,
  RbacAuthorizationV1Api,
  V1Status,
  KubeConfig,
  Watch
} from "@kubernetes/client-node";
import { K8sResource, isSameObject, ResourceCache, union } from "../common";
import { IncomingMessage } from "http";
import { log } from "@opstrace/utils";

export type RoleBindingType = RoleBinding;
export type RoleBindings = RoleBindingType[];

export const isRoleBinding = <(r: K8sResource) => r is RoleBindingType>(
  (resource => resource instanceof RoleBinding)
);

export const roleBindingActions = {
  fetch: createAsyncAction(
    "FETCH_K8S_ROLE_BINDINGS_REQUEST",
    "FETCH_K8S_ROLE_BINDINGS_SUCCESS",
    "FETCH_K8S_ROLE_BINDINGS_FAILURE"
  )<Record<string, unknown>, { resources: RoleBindings }, { error: Error }>(),
  onUpdated: createAction("ON_UPDATED_K8S_ROLE_BINDINGS")<RoleBindingType>(),
  onAdded: createAction("ON_ADDED_K8S_ROLE_BINDINGS")<RoleBindingType>(),
  onDestroyed: createAction("ON_DESTROYED_K8S_ROLE_BINDINGS")<RoleBindingType>()
};
export type RoleBindingActions = ActionType<typeof roleBindingActions>;
export type RoleBindingState = ResourceCache<RoleBindingType>;

const initialState: RoleBindingState = {
  loaded: false,
  error: null,
  resources: []
};

export const roleBindingsReducer = createReducer<
  RoleBindingState,
  RoleBindingActions
>(initialState)
  .handleAction(
    roleBindingActions.fetch.request,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (state, _): RoleBindingState => ({
      ...state,
      loaded: false
    })
  )
  .handleAction(
    roleBindingActions.fetch.success,
    (state, action): RoleBindingState => ({
      ...state,
      ...action.payload,
      resources: union(state.resources, action.payload.resources),
      error: null,
      loaded: true
    })
  )
  .handleAction(
    roleBindingActions.fetch.failure,
    (state, action): RoleBindingState => ({
      ...state,
      ...action.payload,
      loaded: false
    })
  )
  .handleAction(
    [roleBindingActions.onUpdated, roleBindingActions.onAdded],
    (state, action): RoleBindingState => ({
      ...state,
      resources: [
        ...state.resources.filter(s => !isSameObject(s, action.payload)),
        action.payload
      ]
    })
  )
  .handleAction(
    roleBindingActions.onDestroyed,
    (state, action): RoleBindingState => ({
      ...state,
      resources: state.resources.filter(s => !isSameObject(s, action.payload))
    })
  );

export class RoleBinding extends K8sResource {
  protected api: RbacAuthorizationV1Api;
  protected resource: V1RoleBinding;

  constructor(resource: V1RoleBinding, kubeConfig: KubeConfig) {
    super(resource, kubeConfig);

    this.resource = resource;
    this.api = kubeConfig.makeApiClient(RbacAuthorizationV1Api);
  }
  get spec(): V1RoleBinding {
    return this.resource;
  }
  static startInformer(
    kubeConfig: KubeConfig,
    channel: (input: unknown) => void
  ): () => void {
    const client = kubeConfig.makeApiClient(RbacAuthorizationV1Api);
    let cancelled = false;
    let request: Request;
    //@ts-ignore: error TS7023: 'watch' implicitly has return type 'any'
    const watch = async () => {
      if (cancelled) {
        return;
      }
      try {
        const res = await client.listRoleBindingForAllNamespaces();
        channel(
          roleBindingActions.fetch.success({
            resources: res.body.items.map(r => new RoleBinding(r, kubeConfig))
          })
        );
      } catch (error) {
        channel(roleBindingActions.fetch.failure({ error }));
        log.warning("starting informer failed (will retry):  %s", error);
        return setTimeout(watch, 3000);
      }
      const informer = new Watch(kubeConfig);
      const watchHandler = (phase: string, obj: V1RoleBinding) => {
        switch (phase) {
          case "ADDED":
            channel(
              roleBindingActions.onAdded(new RoleBinding(obj, kubeConfig))
            );
            break;
          case "MODIFIED":
            channel(
              roleBindingActions.onUpdated(new RoleBinding(obj, kubeConfig))
            );
            break;
          case "DELETED":
            channel(
              roleBindingActions.onDestroyed(new RoleBinding(obj, kubeConfig))
            );
            break;
        }
      };
      request = await informer.watch(
        "/apis/rbac.authorization.k8s.io/v1/rolebindings",
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
    body: V1RoleBinding;
  }> {
    return this.api.createNamespacedRoleBinding(this.namespace, this.resource);
  }
  read(): Promise<{
    response: IncomingMessage;
    body: V1RoleBinding;
  }> {
    return this.api.readNamespacedRoleBinding(this.name, this.namespace);
  }
  update(): Promise<{
    response: IncomingMessage;
    body: V1RoleBinding;
  }> {
    return this.api.patchNamespacedRoleBinding(
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
    return this.api.deleteNamespacedRoleBinding(this.name, this.namespace);
  }
}
