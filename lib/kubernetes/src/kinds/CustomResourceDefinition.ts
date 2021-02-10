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
  ApiextensionsV1Api,
  V1Status,
  V1CustomResourceDefinition,
  KubeConfig,
  Watch
} from "@kubernetes/client-node";
import { K8sResource, isSameObject, ResourceCache } from "../common";
import { IncomingMessage } from "http";
import { log } from "@opstrace/utils";

export type CustomResourceDefinitionType = CustomResourceDefinition;
export type CustomResourceDefinitions = CustomResourceDefinitionType[];

export const isCustomResourceDefinition = <
  (r: K8sResource) => r is CustomResourceDefinitionType
>(resource => resource instanceof CustomResourceDefinition);

export const crdActions = {
  fetch: createAsyncAction(
    "FETCH_K8S_CRDS_REQUEST",
    "FETCH_K8S_CRDS_SUCCESS",
    "FETCH_K8S_CRDS_FAILURE"
  )<
    Record<string, unknown>,
    { resources: CustomResourceDefinitions },
    { error: Error }
  >(),
  onUpdated: createAction("ON_UPDATED_K8S_CRDS")<
    CustomResourceDefinitionType
  >(),
  onAdded: createAction("ON_ADDED_K8S_CRDS")<CustomResourceDefinitionType>(),
  onDestroyed: createAction("ON_DESTROYED_K8S_CRDS")<
    CustomResourceDefinitionType
  >()
};
export type CustomResourceDefinitionActions = ActionType<typeof crdActions>;
export type CustomResourceDefinitionState = ResourceCache<
  CustomResourceDefinitionType
>;

const initialState: CustomResourceDefinitionState = {
  loaded: false,
  error: null,
  resources: []
};

export const crdsReducer = createReducer<
  CustomResourceDefinitionState,
  CustomResourceDefinitionActions
>(initialState)
  .handleAction(
    crdActions.fetch.request,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (state, _): CustomResourceDefinitionState => ({
      ...state,
      loaded: false
    })
  )
  .handleAction(
    crdActions.fetch.success,
    (state, action): CustomResourceDefinitionState => ({
      ...state,
      ...action.payload,
      error: null,
      loaded: true
    })
  )
  .handleAction(
    crdActions.fetch.failure,
    (state, action): CustomResourceDefinitionState => ({
      ...state,
      ...action.payload,
      loaded: false
    })
  )
  .handleAction(
    [crdActions.onUpdated, crdActions.onAdded],
    (state, action): CustomResourceDefinitionState => ({
      ...state,
      resources: [
        ...state.resources.filter(s => !isSameObject(s, action.payload)),
        action.payload
      ]
    })
  )
  .handleAction(
    crdActions.onDestroyed,
    (state, action): CustomResourceDefinitionState => ({
      ...state,
      resources: state.resources.filter(s => !isSameObject(s, action.payload))
    })
  );

const api = ApiextensionsV1Api;

export class CustomResourceDefinition extends K8sResource {
  protected api: ApiextensionsV1Api;
  protected resource: V1CustomResourceDefinition;

  constructor(resource: V1CustomResourceDefinition, kubeConfig: KubeConfig) {
    super(resource, kubeConfig);

    this.resource = resource;
    this.api = kubeConfig.makeApiClient(api);
  }
  get spec(): V1CustomResourceDefinition {
    return this.resource;
  }
  get namespace(): string {
    return "default";
  }
  static startInformer(
    kubeConfig: KubeConfig,
    channel: (input: unknown) => void
  ): () => void {
    const client = kubeConfig.makeApiClient(api);
    let cancelled = false;
    let request: Request;
    const watch = async () => {
      if (cancelled) {
        return;
      }
      try {
        const res = await client.listCustomResourceDefinition();
        channel(
          crdActions.fetch.success({
            resources: res.body.items.map(
              r => new CustomResourceDefinition(r, kubeConfig)
            )
          })
        );
      } catch (error) {
        channel(crdActions.fetch.failure({ error }));
        log.warning("starting informer failed (will retry):  %s", error);
        return setTimeout(watch, 3000);
      }
      const informer = new Watch(kubeConfig);
      const watchHandler = (phase: string, obj: V1CustomResourceDefinition) => {
        switch (phase) {
          case "ADDED":
            channel(
              crdActions.onAdded(new CustomResourceDefinition(obj, kubeConfig))
            );
            break;
          case "MODIFIED":
            channel(
              crdActions.onUpdated(
                new CustomResourceDefinition(obj, kubeConfig)
              )
            );
            break;
          case "DELETED":
            channel(
              crdActions.onDestroyed(
                new CustomResourceDefinition(obj, kubeConfig)
              )
            );
            break;
        }
      };
      request = await informer.watch(
        "/apis/apiextensions.k8s.io/v1beta1/customresourcedefinitions",
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
    body: V1CustomResourceDefinition;
  }> {
    return this.api.createCustomResourceDefinition(this.resource);
  }
  read(): Promise<{
    response: IncomingMessage;
    body: V1CustomResourceDefinition;
  }> {
    return this.api.readCustomResourceDefinition(this.name);
  }
  update(): Promise<{
    response: IncomingMessage;
    body: V1CustomResourceDefinition;
  }> {
    return this.api.patchCustomResourceDefinition(
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
    return this.api.deleteCustomResourceDefinition(this.name);
  }
}
