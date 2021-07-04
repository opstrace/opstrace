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
  V1APIService,
  ApiregistrationV1Api,
  V1Status,
  KubeConfig,
  Watch
} from "@kubernetes/client-node";
import { K8sResource, isSameObject, ResourceCache } from "../common";
import { IncomingMessage } from "http";
import { log } from "@opstrace/utils";

export type ApiServiceType = ApiService;
export type ApiServices = ApiServiceType[];

export const isApiService = <(r: K8sResource) => r is ApiServiceType>(
  (resource => resource instanceof ApiService)
);

export const apiServiceActions = {
  fetch: createAsyncAction(
    "FETCH_K8S_API_SERVICES_REQUEST",
    "FETCH_K8S_API_SERVICES_SUCCESS",
    "FETCH_K8S_API_SERVICES_FAILURE"
  )<Record<string, unknown>, { resources: ApiServices }, { error: Error }>(),
  onUpdated: createAction("ON_UPDATED_K8S_API_SERVICE")<ApiServiceType>(),
  onAdded: createAction("ON_ADDED_K8S_API_SERVICE")<ApiServiceType>(),
  onDestroyed: createAction("ON_DESTROYED_K8S_API_SERVICE")<ApiServiceType>()
};
export type ApiServiceActions = ActionType<typeof apiServiceActions>;
export type ApiServiceState = ResourceCache<ApiServiceType>;

const initialState: ApiServiceState = {
  loaded: false,
  error: null,
  resources: []
};

export const apiServicesReducer = createReducer<
  ApiServiceState,
  ApiServiceActions
>(initialState)
  .handleAction(
    apiServiceActions.fetch.request,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (state, _): ApiServiceState => ({
      ...state,
      loaded: false
    })
  )
  .handleAction(
    apiServiceActions.fetch.success,
    (state, action): ApiServiceState => ({
      ...state,
      ...action.payload,
      error: null,
      loaded: true
    })
  )
  .handleAction(
    apiServiceActions.fetch.failure,
    (state, action): ApiServiceState => ({
      ...state,
      ...action.payload,
      loaded: false
    })
  )
  .handleAction(
    [apiServiceActions.onUpdated, apiServiceActions.onAdded],
    (state, action): ApiServiceState => ({
      ...state,
      resources: [
        ...state.resources.filter(s => !isSameObject(s, action.payload)),
        action.payload
      ]
    })
  )
  .handleAction(
    apiServiceActions.onDestroyed,
    (state, action): ApiServiceState => ({
      ...state,
      resources: state.resources.filter(s => !isSameObject(s, action.payload))
    })
  );

export class ApiService extends K8sResource {
  protected api: ApiregistrationV1Api;
  protected resource: V1APIService;

  constructor(resource: V1APIService, kubeConfig: KubeConfig) {
    super(resource, kubeConfig);

    this.resource = resource;
    this.api = kubeConfig.makeApiClient(ApiregistrationV1Api);
  }
  get spec(): V1APIService {
    return this.resource;
  }
  get namespace(): string {
    return "default";
  }
  static startInformer(
    kubeConfig: KubeConfig,
    channel: (input: unknown) => void
  ): () => void {
    const client = kubeConfig.makeApiClient(ApiregistrationV1Api);
    let cancelled = false;
    let request: Request;
    //@ts-ignore: error TS7023: 'watch' implicitly has return type 'any'
    const watch = async () => {
      if (cancelled) {
        return;
      }
      try {
        const res = await client.listAPIService();
        channel(
          apiServiceActions.fetch.success({
            resources: res.body.items.map(r => new ApiService(r, kubeConfig))
          })
        );
      } catch (error) {
        channel(apiServiceActions.fetch.failure({ error }));
        log.warning("starting informer failed (will retry):  %s", error);
        return setTimeout(watch, 3000);
      }
      const informer = new Watch(kubeConfig);
      const watchHandler = (phase: string, obj: V1APIService) => {
        switch (phase) {
          case "ADDED":
            channel(apiServiceActions.onAdded(new ApiService(obj, kubeConfig)));
            break;
          case "MODIFIED":
            channel(
              apiServiceActions.onUpdated(new ApiService(obj, kubeConfig))
            );
            break;
          case "DELETED":
            channel(
              apiServiceActions.onDestroyed(new ApiService(obj, kubeConfig))
            );
            break;
        }
      };
      request = await informer.watch(
        "/apis/apiregistration.k8s.io/v1/apiservices",
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
    body: V1APIService;
  }> {
    return this.api.createAPIService(this.resource);
  }
  read(): Promise<{
    response: IncomingMessage;
    body: V1APIService;
  }> {
    return this.api.readAPIService(this.name);
  }
  update(): Promise<{
    response: IncomingMessage;
    body: V1APIService;
  }> {
    return this.api.patchAPIService(
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
    return this.api.deleteAPIService(this.name);
  }
}
