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
  NetworkingV1beta1Api,
  V1Status,
  NetworkingV1beta1Ingress,
  KubeConfig,
  Watch
} from "@kubernetes/client-node";
import { K8sResource, isSameObject, ResourceCache } from "../common";
import { IncomingMessage } from "http";
import { log } from "@opstrace/utils";

export type IngressType = Ingress;
export type Ingresses = IngressType[];

export const isIngress = <(r: K8sResource) => r is IngressType>(
  (resource => resource instanceof Ingress)
);

export const ingressActions = {
  fetch: createAsyncAction(
    "FETCH_K8S_INGRESSES_REQUEST",
    "FETCH_K8S_INGRESSES_SUCCESS",
    "FETCH_K8S_INGRESSES_FAILURE"
  )<Record<string, unknown>, { resources: Ingresses }, { error: Error }>(),
  onUpdated: createAction("ON_UPDATED_K8S_INGRESSES")<IngressType>(),
  onAdded: createAction("ON_ADDED_K8S_INGRESSES")<IngressType>(),
  onDestroyed: createAction("ON_DESTROYED_K8S_INGRESSES")<IngressType>()
};
export type IngressActions = ActionType<typeof ingressActions>;
export type IngressState = ResourceCache<IngressType>;

const initialState: IngressState = {
  loaded: false,
  error: null,
  resources: []
};

export const ingressesReducer = createReducer<IngressState, IngressActions>(
  initialState
)
  .handleAction(
    ingressActions.fetch.request,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (state, _): IngressState => ({
      ...state,
      loaded: false
    })
  )
  .handleAction(
    ingressActions.fetch.success,
    (state, action): IngressState => ({
      ...state,
      ...action.payload,
      error: null,
      loaded: true
    })
  )
  .handleAction(
    ingressActions.fetch.failure,
    (state, action): IngressState => ({
      ...state,
      ...action.payload,
      loaded: false
    })
  )
  .handleAction(
    [ingressActions.onUpdated, ingressActions.onAdded],
    (state, action): IngressState => ({
      ...state,
      resources: [
        ...state.resources.filter(s => !isSameObject(s, action.payload)),
        action.payload
      ]
    })
  )
  .handleAction(
    ingressActions.onDestroyed,
    (state, action): IngressState => ({
      ...state,
      resources: state.resources.filter(s => !isSameObject(s, action.payload))
    })
  );

export class Ingress extends K8sResource {
  protected api: NetworkingV1beta1Api;
  protected resource: NetworkingV1beta1Ingress;

  constructor(resource: NetworkingV1beta1Ingress, kubeConfig: KubeConfig) {
    super(resource, kubeConfig);

    this.resource = resource;
    this.api = kubeConfig.makeApiClient(NetworkingV1beta1Api);
  }
  get spec(): NetworkingV1beta1Ingress {
    return this.resource;
  }
  static startInformer(
    kubeConfig: KubeConfig,
    channel: (input: unknown) => void
  ): () => void {
    const client = kubeConfig.makeApiClient(NetworkingV1beta1Api);
    let cancelled = false;
    let request: Request;
    const watch = async () => {
      if (cancelled) {
        return;
      }
      try {
        const res = await client.listIngressForAllNamespaces();
        channel(
          ingressActions.fetch.success({
            resources: res.body.items.map(r => new Ingress(r, kubeConfig))
          })
        );
      } catch (error) {
        channel(ingressActions.fetch.failure({ error }));
        log.warning("starting informer failed (will retry):  %s", error);
        return setTimeout(watch, 3000);
      }
      const informer = new Watch(kubeConfig);
      const watchHandler = (phase: string, obj: NetworkingV1beta1Ingress) => {
        switch (phase) {
          case "ADDED":
            channel(ingressActions.onAdded(new Ingress(obj, kubeConfig)));
            break;
          case "MODIFIED":
            channel(ingressActions.onUpdated(new Ingress(obj, kubeConfig)));
            break;
          case "DELETED":
            channel(ingressActions.onDestroyed(new Ingress(obj, kubeConfig)));
            break;
        }
      };
      request = await informer.watch(
        "/apis/extensions/v1beta1/ingresses",
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
    body: NetworkingV1beta1Ingress;
  }> {
    return this.api.createNamespacedIngress(this.namespace, this.resource);
  }
  read(): Promise<{
    response: IncomingMessage;
    body: NetworkingV1beta1Ingress;
  }> {
    return this.api.readNamespacedIngress(this.name, this.namespace);
  }
  update(): Promise<{
    response: IncomingMessage;
    body: NetworkingV1beta1Ingress;
  }> {
    return this.api.patchNamespacedIngress(
      this.name,
      this.namespace,
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
    return this.api.deleteNamespacedIngress(this.name, this.namespace);
  }
}
