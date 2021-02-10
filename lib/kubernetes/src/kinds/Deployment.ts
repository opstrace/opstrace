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
  V1Deployment,
  KubeConfig,
  Watch
} from "@kubernetes/client-node";

import { K8sResource, isSameObject, ResourceCache, union } from "../common";
import { IncomingMessage } from "http";
import { log } from "@opstrace/utils";

export type DeploymentType = Deployment;
export type Deployments = DeploymentType[];

export const isDeployment = <(r: K8sResource) => r is DeploymentType>(
  (resource => resource instanceof Deployment)
);

export const deploymentActions = {
  fetch: createAsyncAction(
    "FETCH_K8S_DEPLOYMENTS_REQUEST",
    "FETCH_K8S_DEPLOYMENTS_SUCCESS",
    "FETCH_K8S_DEPLOYMENTS_FAILURE"
  )<Record<string, unknown>, { resources: Deployments }, { error: Error }>(),
  onUpdated: createAction("ON_UPDATED_K8S_DEPLOYMENTS")<DeploymentType>(),
  onAdded: createAction("ON_ADDED_K8S_DEPLOYMENTS")<DeploymentType>(),
  onDestroyed: createAction("ON_DESTROYED_K8S_DEPLOYMENTS")<DeploymentType>()
};
export type DeploymentActions = ActionType<typeof deploymentActions>;
export type DeploymentState = ResourceCache<DeploymentType>;

const initialState: DeploymentState = {
  loaded: false,
  error: null,
  resources: []
};

export const deploymentsReducer = createReducer<
  DeploymentState,
  DeploymentActions
>(initialState)
  .handleAction(
    deploymentActions.fetch.request,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (state, _): DeploymentState => ({
      ...state,
      loaded: false
    })
  )
  .handleAction(
    deploymentActions.fetch.success,
    (state, action): DeploymentState => ({
      ...state,
      ...action.payload,
      resources: union(state.resources, action.payload.resources),
      error: null,
      loaded: true
    })
  )
  .handleAction(
    deploymentActions.fetch.failure,
    (state, action): DeploymentState => ({
      ...state,
      ...action.payload,
      loaded: false
    })
  )
  .handleAction(
    [deploymentActions.onUpdated, deploymentActions.onAdded],
    (state, action): DeploymentState => ({
      ...state,
      resources: [
        ...state.resources.filter(s => !isSameObject(s, action.payload)),
        action.payload
      ]
    })
  )
  .handleAction(
    deploymentActions.onDestroyed,
    (state, action): DeploymentState => ({
      ...state,
      resources: state.resources.filter(s => !isSameObject(s, action.payload))
    })
  );

export class Deployment extends K8sResource {
  protected api: AppsV1Api;
  protected resource: V1Deployment;

  constructor(resource: V1Deployment, kubeConfig: KubeConfig) {
    super(resource, kubeConfig);

    this.resource = resource;
    this.api = kubeConfig.makeApiClient(AppsV1Api);
  }
  get spec(): V1Deployment {
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
        const res = await client.listDeploymentForAllNamespaces();
        channel(
          deploymentActions.fetch.success({
            resources: res.body.items.map(r => new Deployment(r, kubeConfig))
          })
        );
      } catch (error) {
        channel(deploymentActions.fetch.failure({ error }));
        log.warning("starting informer failed (will retry):  %s", error);
        return setTimeout(watch, 3000);
      }
      const informer = new Watch(kubeConfig);
      const watchHandler = (phase: string, obj: V1Deployment) => {
        switch (phase) {
          case "ADDED":
            channel(deploymentActions.onAdded(new Deployment(obj, kubeConfig)));
            break;
          case "MODIFIED":
            channel(
              deploymentActions.onUpdated(new Deployment(obj, kubeConfig))
            );
            break;
          case "DELETED":
            channel(
              deploymentActions.onDestroyed(new Deployment(obj, kubeConfig))
            );
            break;
        }
      };
      request = await informer.watch(
        "/apis/apps/v1/deployments",
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
    body: V1Deployment;
  }> {
    return this.api.createNamespacedDeployment(this.namespace, this.resource);
  }
  read(): Promise<{
    response: IncomingMessage;
    body: V1Deployment;
  }> {
    return this.api.readNamespacedDeployment(this.name, this.namespace);
  }
  update(): Promise<{
    response: IncomingMessage;
    body: V1Deployment;
  }> {
    return this.api.patchNamespacedDeployment(
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
    return this.api.deleteNamespacedDeployment(this.name, this.namespace);
  }
}
