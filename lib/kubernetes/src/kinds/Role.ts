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
  V1Role,
  RbacAuthorizationV1Api,
  V1Status,
  KubeConfig,
  Watch
} from "@kubernetes/client-node";
import { K8sResource, isSameObject, ResourceCache, union } from "../common";
import { IncomingMessage } from "http";
import { log } from "@opstrace/utils";

export type RoleType = Role;
export type Roles = RoleType[];

export const isRole = <(r: K8sResource) => r is RoleType>(
  (resource => resource instanceof Role)
);

export const roleActions = {
  fetch: createAsyncAction(
    "FETCH_K8S_ROLES_REQUEST",
    "FETCH_K8S_ROLES_SUCCESS",
    "FETCH_K8S_ROLES_FAILURE"
  )<Record<string, unknown>, { resources: Roles }, { error: Error }>(),
  onUpdated: createAction("ON_UPDATED_K8S_ROLES")<RoleType>(),
  onAdded: createAction("ON_ADDED_K8S_ROLES")<RoleType>(),
  onDestroyed: createAction("ON_DESTROYED_K8S_ROLES")<RoleType>()
};
export type RoleActions = ActionType<typeof roleActions>;
export type RoleState = ResourceCache<RoleType>;

const initialState: RoleState = {
  loaded: false,
  error: null,
  resources: []
};

export const rolesReducer = createReducer<RoleState, RoleActions>(initialState)
  .handleAction(
    roleActions.fetch.request,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (state, _): RoleState => ({
      ...state,
      loaded: false
    })
  )
  .handleAction(
    roleActions.fetch.success,
    (state, action): RoleState => ({
      ...state,
      ...action.payload,
      resources: union(state.resources, action.payload.resources),
      error: null,
      loaded: true
    })
  )
  .handleAction(
    roleActions.fetch.failure,
    (state, action): RoleState => ({
      ...state,
      ...action.payload,
      loaded: false
    })
  )
  .handleAction(
    [roleActions.onUpdated, roleActions.onAdded],
    (state, action): RoleState => ({
      ...state,
      resources: [
        ...state.resources.filter(s => !isSameObject(s, action.payload)),
        action.payload
      ]
    })
  )
  .handleAction(
    roleActions.onDestroyed,
    (state, action): RoleState => ({
      ...state,
      resources: state.resources.filter(s => !isSameObject(s, action.payload))
    })
  );

export class Role extends K8sResource {
  protected api: RbacAuthorizationV1Api;
  protected resource: V1Role;

  constructor(resource: V1Role, kubeConfig: KubeConfig) {
    super(resource, kubeConfig);

    this.resource = resource;
    this.api = kubeConfig.makeApiClient(RbacAuthorizationV1Api);
  }
  get spec(): V1Role {
    return this.resource;
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
        const res = await client.listRoleForAllNamespaces();
        channel(
          roleActions.fetch.success({
            resources: res.body.items.map(r => new Role(r, kubeConfig))
          })
        );
      } catch (error) {
        channel(roleActions.fetch.failure({ error }));
        log.warning("starting informer failed (will retry):  %s", error);
        return setTimeout(watch, 3000);
      }
      const informer = new Watch(kubeConfig);
      const watchHandler = (phase: string, obj: V1Role) => {
        switch (phase) {
          case "ADDED":
            channel(roleActions.onAdded(new Role(obj, kubeConfig)));
            break;
          case "MODIFIED":
            channel(roleActions.onUpdated(new Role(obj, kubeConfig)));
            break;
          case "DELETED":
            channel(roleActions.onDestroyed(new Role(obj, kubeConfig)));
            break;
        }
      };
      request = await informer.watch(
        "/apis/rbac.authorization.k8s.io/v1/roles",
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
    body: V1Role;
  }> {
    return this.api.createNamespacedRole(this.namespace, this.resource);
  }
  read(): Promise<{
    response: IncomingMessage;
    body: V1Role;
  }> {
    return this.api.readNamespacedRole(this.name, this.namespace);
  }
  update(): Promise<{
    response: IncomingMessage;
    body: V1Role;
  }> {
    return this.api.patchNamespacedRole(
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
    return this.api.deleteNamespacedRole(this.name, this.namespace);
  }
}
