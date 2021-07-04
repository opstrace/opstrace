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
  V1Service,
  CoreV1Api,
  V1Status,
  KubeConfig,
  Watch
} from "@kubernetes/client-node";
import { K8sResource, isSameObject, ResourceCache } from "../common";
import { IncomingMessage } from "http";
import { log } from "@opstrace/utils";

export type ServiceType = Service;
export type Services = ServiceType[];

export const isService = <(r: K8sResource) => r is ServiceType>(
  (resource => resource instanceof Service)
);

export const serviceActions = {
  fetch: createAsyncAction(
    "FETCH_K8S_SERVICES_REQUEST",
    "FETCH_K8S_SERVICES_SUCCESS",
    "FETCH_K8S_SERVICES_FAILURE"
  )<Record<string, unknown>, { resources: Services }, { error: Error }>(),
  onUpdated: createAction("ON_UPDATED_K8S_SERVICES")<ServiceType>(),
  onAdded: createAction("ON_ADDED_K8S_SERVICES")<ServiceType>(),
  onDestroyed: createAction("ON_DESTROYED_K8S_SERVICES")<ServiceType>()
};
export type ServiceActions = ActionType<typeof serviceActions>;
export type ServiceState = ResourceCache<ServiceType>;

const initialState: ServiceState = {
  loaded: false,
  error: null,
  resources: []
};

export const servicesReducer = createReducer<ServiceState, ServiceActions>(
  initialState
)
  .handleAction(
    serviceActions.fetch.request,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (state, _): ServiceState => ({
      ...state,
      loaded: false
    })
  )
  .handleAction(
    serviceActions.fetch.success,
    (state, action): ServiceState => ({
      ...state,
      ...action.payload,
      error: null,
      loaded: true
    })
  )
  .handleAction(
    serviceActions.fetch.failure,
    (state, action): ServiceState => ({
      ...state,
      ...action.payload,
      loaded: false
    })
  )
  .handleAction(
    [serviceActions.onUpdated, serviceActions.onAdded],
    (state, action): ServiceState => ({
      ...state,
      resources: [
        ...state.resources.filter(s => !isSameObject(s, action.payload)),
        action.payload
      ]
    })
  )
  .handleAction(
    serviceActions.onDestroyed,
    (state, action): ServiceState => ({
      ...state,
      resources: state.resources.filter(s => !isSameObject(s, action.payload))
    })
  );

export class Service extends K8sResource {
  protected api: CoreV1Api;
  protected resource: V1Service;

  constructor(resource: V1Service, kubeConfig: KubeConfig) {
    super(resource, kubeConfig);

    this.resource = resource;
    this.api = kubeConfig.makeApiClient(CoreV1Api);
  }
  get spec(): V1Service {
    return this.resource;
  }
  static startInformer(
    kubeConfig: KubeConfig,
    channel: (input: unknown) => void
  ): () => void {
    const client = kubeConfig.makeApiClient(CoreV1Api);
    let cancelled = false;
    let request: Request;
    //@ts-ignore: error TS7023: 'watch' implicitly has return type 'any'
    const watch = async () => {
      if (cancelled) {
        return;
      }
      try {
        const res = await client.listServiceForAllNamespaces();
        channel(
          serviceActions.fetch.success({
            resources: res.body.items.map(r => new Service(r, kubeConfig))
          })
        );
      } catch (error) {
        channel(serviceActions.fetch.failure({ error }));
        log.warning("starting informer failed (will retry):  %s", error);
        return setTimeout(watch, 3000);
      }
      const informer = new Watch(kubeConfig);
      const watchHandler = (phase: string, obj: V1Service) => {
        switch (phase) {
          case "ADDED":
            channel(serviceActions.onAdded(new Service(obj, kubeConfig)));
            break;
          case "MODIFIED":
            channel(serviceActions.onUpdated(new Service(obj, kubeConfig)));
            break;
          case "DELETED":
            channel(serviceActions.onDestroyed(new Service(obj, kubeConfig)));
            break;
        }
      };
      request = await informer.watch(
        "/api/v1/services",
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
    body: V1Service;
  }> {
    return this.api.createNamespacedService(this.namespace, this.resource);
  }
  read(): Promise<{
    response: IncomingMessage;
    body: V1Service;
  }> {
    return this.api.readNamespacedService(this.name, this.namespace);
  }
  update(): Promise<{
    response: IncomingMessage;
    body: V1Service;
  }> {
    return this.api.patchNamespacedService(
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
    return this.api.deleteNamespacedService(this.name, this.namespace);
  }
}
