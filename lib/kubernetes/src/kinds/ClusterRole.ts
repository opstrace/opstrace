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
  RbacAuthorizationV1Api,
  V1Status,
  V1ClusterRole,
  KubeConfig,
  Watch
} from "@kubernetes/client-node";
import { K8sResource, isSameObject, ResourceCache } from "../common";
import { IncomingMessage } from "http";
import { log } from "@opstrace/utils";

export type ClusterRoleType = ClusterRole;
export type ClusterRoles = ClusterRoleType[];

export const isClusterRole = <(r: K8sResource) => r is ClusterRoleType>(
  (resource => resource instanceof ClusterRole)
);

export const clusterRoleActions = {
  fetch: createAsyncAction(
    "FETCH_K8S_CLUSTER_ROLES_REQUEST",
    "FETCH_K8S_CLUSTER_ROLES_SUCCESS",
    "FETCH_K8S_CLUSTER_ROLES_FAILURE"
  )<Record<string, unknown>, { resources: ClusterRoles }, { error: Error }>(),
  onUpdated: createAction("ON_UPDATED_K8S_ClUSTER_ROLES")<ClusterRoleType>(),
  onAdded: createAction("ON_ADDED_K8S_ClUSTER_ROLES")<ClusterRoleType>(),
  onDestroyed: createAction("ON_DESTROYED_K8S_ClUSTER_ROLES")<ClusterRoleType>()
};
export type ClusterRoleActions = ActionType<typeof clusterRoleActions>;
export type ClusterRoleState = ResourceCache<ClusterRoleType>;

const initialState: ClusterRoleState = {
  loaded: false,
  error: null,
  resources: []
};

export const clusterRolesReducer = createReducer<
  ClusterRoleState,
  ClusterRoleActions
>(initialState)
  .handleAction(
    clusterRoleActions.fetch.request,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (state, _): ClusterRoleState => ({
      ...state,
      loaded: false
    })
  )
  .handleAction(
    clusterRoleActions.fetch.success,
    (state, action): ClusterRoleState => ({
      ...state,
      ...action.payload,
      error: null,
      loaded: true
    })
  )
  .handleAction(
    clusterRoleActions.fetch.failure,
    (state, action): ClusterRoleState => ({
      ...state,
      ...action.payload,
      loaded: false
    })
  )
  .handleAction(
    [clusterRoleActions.onUpdated, clusterRoleActions.onAdded],
    (state, action): ClusterRoleState => ({
      ...state,
      resources: [
        ...state.resources.filter(s => !isSameObject(s, action.payload)),
        action.payload
      ]
    })
  )
  .handleAction(
    clusterRoleActions.onDestroyed,
    (state, action): ClusterRoleState => ({
      ...state,
      resources: state.resources.filter(s => !isSameObject(s, action.payload))
    })
  );

export class ClusterRole extends K8sResource {
  protected api: RbacAuthorizationV1Api;
  protected resource: V1ClusterRole;

  constructor(resource: V1ClusterRole, kubeConfig: KubeConfig) {
    super(resource, kubeConfig);

    this.resource = resource;
    this.api = kubeConfig.makeApiClient(RbacAuthorizationV1Api);
  }
  get spec(): V1ClusterRole {
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
        const res = await client.listClusterRole();
        channel(
          clusterRoleActions.fetch.success({
            resources: res.body.items.map(r => new ClusterRole(r, kubeConfig))
          })
        );
      } catch (error) {
        channel(clusterRoleActions.fetch.failure({ error }));
        log.warning("starting informer failed (will retry):  %s", error);
        return setTimeout(watch, 3000);
      }
      const informer = new Watch(kubeConfig);
      const watchHandler = (phase: string, obj: V1ClusterRole) => {
        switch (phase) {
          case "ADDED":
            channel(
              clusterRoleActions.onAdded(new ClusterRole(obj, kubeConfig))
            );
            break;
          case "MODIFIED":
            channel(
              clusterRoleActions.onUpdated(new ClusterRole(obj, kubeConfig))
            );
            break;
          case "DELETED":
            channel(
              clusterRoleActions.onDestroyed(new ClusterRole(obj, kubeConfig))
            );
            break;
        }
      };
      request = await informer.watch(
        "/apis/rbac.authorization.k8s.io/v1/clusterroles",
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
    body: V1ClusterRole;
  }> {
    return this.api.createClusterRole(this.resource);
  }
  read(): Promise<{
    response: IncomingMessage;
    body: V1ClusterRole;
  }> {
    return this.api.readClusterRole(this.name);
  }
  update(): Promise<{
    response: IncomingMessage;
    body: V1ClusterRole;
  }> {
    return this.api.patchClusterRole(
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
    return this.api.deleteClusterRole(this.name);
  }
}
