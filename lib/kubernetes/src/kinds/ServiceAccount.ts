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
  V1ServiceAccount,
  CoreV1Api,
  V1Status,
  KubeConfig,
  Watch
} from "@kubernetes/client-node";
import { K8sResource, isSameObject, ResourceCache } from "../common";
import { IncomingMessage } from "http";
import { log } from "@opstrace/utils";

export type ServiceAccountType = ServiceAccount;
export type ServiceAccounts = ServiceAccountType[];

export const isServiceAccount = <(r: K8sResource) => r is ServiceAccountType>(
  (resource => resource instanceof ServiceAccount)
);

export const serviceAccountActions = {
  fetch: createAsyncAction(
    "FETCH_K8S_SERVICE_ACCOUNTS_REQUEST",
    "FETCH_K8S_SERVICE_ACCOUNTS_SUCCESS",
    "FETCH_K8S_SERVICE_ACCOUNTS_FAILURE"
  )<
    Record<string, unknown>,
    { resources: ServiceAccounts },
    { error: Error }
  >(),
  onUpdated: createAction(
    "ON_UPDATED_K8S_SERVICE_ACCOUNTS"
  )<ServiceAccountType>(),
  onAdded: createAction("ON_ADDED_K8S_SERVICE_ACCOUNTS")<ServiceAccountType>(),
  onDestroyed: createAction(
    "ON_DESTROYED_K8S_SERVICE_ACCOUNTS"
  )<ServiceAccountType>()
};
export type ServiceAccountActions = ActionType<typeof serviceAccountActions>;
export type ServiceAccountState = ResourceCache<ServiceAccountType>;

const initialState: ServiceAccountState = {
  loaded: false,
  error: null,
  resources: []
};

export const serviceAccountsReducer = createReducer<
  ServiceAccountState,
  ServiceAccountActions
>(initialState)
  .handleAction(
    serviceAccountActions.fetch.request,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (state, _): ServiceAccountState => ({
      ...state,
      loaded: false
    })
  )
  .handleAction(
    serviceAccountActions.fetch.success,
    (state, action): ServiceAccountState => ({
      ...state,
      ...action.payload,
      error: null,
      loaded: true
    })
  )
  .handleAction(
    serviceAccountActions.fetch.failure,
    (state, action): ServiceAccountState => ({
      ...state,
      ...action.payload,
      loaded: false
    })
  )
  .handleAction(
    [serviceAccountActions.onUpdated, serviceAccountActions.onAdded],
    (state, action): ServiceAccountState => ({
      ...state,
      resources: [
        ...state.resources.filter(s => !isSameObject(s, action.payload)),
        action.payload
      ]
    })
  )
  .handleAction(
    serviceAccountActions.onDestroyed,
    (state, action): ServiceAccountState => ({
      ...state,
      resources: state.resources.filter(s => !isSameObject(s, action.payload))
    })
  );

export class ServiceAccount extends K8sResource {
  protected api: CoreV1Api;
  protected resource: V1ServiceAccount;

  constructor(resource: V1ServiceAccount, kubeConfig: KubeConfig) {
    super(resource, kubeConfig);

    this.resource = resource;
    this.api = kubeConfig.makeApiClient(CoreV1Api);
  }
  get spec(): V1ServiceAccount {
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
        const res = await client.listServiceAccountForAllNamespaces();
        channel(
          serviceAccountActions.fetch.success({
            resources: res.body.items.map(
              r => new ServiceAccount(r, kubeConfig)
            )
          })
        );
      } catch (error) {
        channel(serviceAccountActions.fetch.failure({ error }));
        log.warning("starting informer failed (will retry):  %s", error);
        return setTimeout(watch, 3000);
      }
      const informer = new Watch(kubeConfig);
      const watchHandler = (phase: string, obj: V1ServiceAccount) => {
        switch (phase) {
          case "ADDED":
            channel(
              serviceAccountActions.onAdded(new ServiceAccount(obj, kubeConfig))
            );
            break;
          case "MODIFIED":
            channel(
              serviceAccountActions.onUpdated(
                new ServiceAccount(obj, kubeConfig)
              )
            );
            break;
          case "DELETED":
            channel(
              serviceAccountActions.onDestroyed(
                new ServiceAccount(obj, kubeConfig)
              )
            );
            break;
        }
      };
      request = await informer.watch(
        "/api/v1/serviceaccounts",
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
    body: V1ServiceAccount;
  }> {
    return this.api.createNamespacedServiceAccount(
      this.namespace,
      this.resource
    );
  }
  read(): Promise<{
    response: IncomingMessage;
    body: V1ServiceAccount;
  }> {
    return this.api.readNamespacedServiceAccount(this.name, this.namespace);
  }
  update(): Promise<{
    response: IncomingMessage;
    body: V1ServiceAccount;
  }> {
    return this.api.patchNamespacedServiceAccount(
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
    return this.api.deleteNamespacedServiceAccount(this.name, this.namespace);
  }
}
