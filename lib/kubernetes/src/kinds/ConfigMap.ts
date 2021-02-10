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
  CoreV1Api,
  V1Status,
  V1ConfigMap,
  KubeConfig,
  Watch
} from "@kubernetes/client-node";
import { K8sResource, isSameObject, ResourceCache } from "../common";
import { IncomingMessage } from "http";
import { log } from "@opstrace/utils";

export type ConfigMapType = ConfigMap;
export type ConfigMaps = ConfigMapType[];

export const isConfigMap = <(r: K8sResource) => r is ConfigMapType>(
  (resource => resource instanceof ConfigMap)
);

export const configMapActions = {
  fetch: createAsyncAction(
    "FETCH_K8S_CONFIGMAPS_REQUEST",
    "FETCH_K8S_CONFIGMAPS_SUCCESS",
    "FETCH_K8S_CONFIGMAPS_FAILURE"
  )<Record<string, unknown>, { resources: ConfigMaps }, { error: Error }>(),
  onUpdated: createAction("ON_UPDATED_K8S_CONFIGMAPS_REQUEST")<ConfigMapType>(),
  onAdded: createAction("ON_ADDED_K8S_CONFIGMAPS_REQUEST")<ConfigMapType>(),
  onDestroyed: createAction("ON_DESTROYED_K8S_CONFIGMAPS_REQUEST")<
    ConfigMapType
  >()
};
export type ConfigMapActions = ActionType<typeof configMapActions>;
export type ConfigMapState = ResourceCache<ConfigMapType>;

const initialState: ConfigMapState = {
  loaded: false,
  error: null,
  resources: []
};

export const configMapsReducer = createReducer<
  ConfigMapState,
  ConfigMapActions
>(initialState)
  .handleAction(
    configMapActions.fetch.request,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (state, _): ConfigMapState => ({
      ...state,
      loaded: false
    })
  )
  .handleAction(
    configMapActions.fetch.success,
    (state, action): ConfigMapState => ({
      ...state,
      ...action.payload,
      error: null,
      loaded: true
    })
  )
  .handleAction(
    configMapActions.fetch.failure,
    (state, action): ConfigMapState => ({
      ...state,
      ...action.payload,
      loaded: false
    })
  )
  .handleAction(
    [configMapActions.onUpdated, configMapActions.onAdded],
    (state, action): ConfigMapState => ({
      ...state,
      resources: [
        ...state.resources.filter(s => !isSameObject(s, action.payload)),
        action.payload
      ]
    })
  )
  .handleAction(
    configMapActions.onDestroyed,
    (state, action): ConfigMapState => ({
      ...state,
      resources: state.resources.filter(s => !isSameObject(s, action.payload))
    })
  );

const api = CoreV1Api;

export class ConfigMap extends K8sResource {
  protected api: CoreV1Api;
  protected resource: V1ConfigMap;

  constructor(resource: V1ConfigMap, kubeConfig: KubeConfig) {
    super(resource, kubeConfig);

    this.resource = resource;
    this.api = kubeConfig.makeApiClient(api);
  }
  get spec(): V1ConfigMap {
    return this.resource;
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
        const res = await client.listConfigMapForAllNamespaces();
        channel(
          configMapActions.fetch.success({
            resources: res.body.items.map(r => new ConfigMap(r, kubeConfig))
          })
        );
      } catch (error) {
        channel(configMapActions.fetch.failure({ error }));
        log.warning("starting informer failed (will retry):  %s", error);
        return setTimeout(watch, 3000);
      }
      const informer = new Watch(kubeConfig);
      const watchHandler = (phase: string, obj: V1ConfigMap) => {
        const configMap = new ConfigMap(obj, kubeConfig);
        if (!configMap.isOurs()) {
          return; // don't care to cache configmaps created by other controllers. They can be noisy
        }
        switch (phase) {
          case "ADDED":
            channel(configMapActions.onAdded(configMap));
            break;
          case "MODIFIED":
            channel(configMapActions.onUpdated(configMap));
            break;
          case "DELETED":
            channel(configMapActions.onDestroyed(configMap));
            break;
        }
      };
      request = await informer.watch(
        "/api/v1/configmaps",
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
    body: V1ConfigMap;
  }> {
    return this.api.createNamespacedConfigMap(
      this.namespace,
      this.resource,
      undefined,
      undefined,
      undefined,
      {
        // https://github.com/kubernetes-client/javascript/issues/544 -- this
        // controls the TCP connect() timeout and most likely the timeout
        // between having sent request and starting to receive the response.
        // @ts-ignore: timeout does not exist on type
        timeout: 10000
      }
    );
  }
  read(): Promise<{
    response: IncomingMessage;
    body: V1ConfigMap;
  }> {
    return this.api.readNamespacedConfigMap(this.name, this.namespace);
  }
  update(): Promise<{
    response: IncomingMessage;
    body: V1ConfigMap;
  }> {
    return this.api.patchNamespacedConfigMap(
      this.name,
      this.namespace,
      this.resource,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        headers: { "Content-Type": "application/merge-patch+json" },
        // https://github.com/kubernetes-client/javascript/issues/544 -- this
        // controls the TCP connect() timeout and most likely the timeout
        // between having sent request and starting to receive the response.
        // Does not seem to work yet, see
        // https://github.com/kubernetes-client/javascript/issues/544#issuecomment-721741462
        // @ts-ignore: timeout does not exist on type
        timeout: 10000
      }
    );
  }
  delete(): Promise<{
    response: IncomingMessage;
    body: V1Status;
  }> {
    return this.api.deleteNamespacedConfigMap(this.name, this.namespace);
  }
}
