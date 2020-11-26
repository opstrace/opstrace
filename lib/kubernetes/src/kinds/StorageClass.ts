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
  V1StorageClass,
  StorageV1Api,
  V1Status,
  KubeConfig,
  Watch
} from "@kubernetes/client-node";
import { K8sResource, isSameObject, ResourceCache } from "../common";
import { IncomingMessage } from "http";
import { log } from "@opstrace/utils";

export type StorageClassType = StorageClass;
export type StorageClasses = StorageClassType[];

export const isStorageClass = <(r: K8sResource) => r is StorageClassType>(
  (resource => resource instanceof StorageClass)
);

export const storageClassActions = {
  fetch: createAsyncAction(
    "FETCH_K8S_STORAGE_CLASSES_REQUEST",
    "FETCH_K8S_STORAGE_CLASSES_SUCCESS",
    "FETCH_K8S_STORAGE_CLASSES_FAILURE"
  )<{}, { resources: StorageClasses }, { error: Error }>(),
  onUpdated: createAction("ON_UPDATED_K8S_STORAGE_CLASSES")<StorageClassType>(),
  onAdded: createAction("ON_ADDED_K8S_STORAGE_CLASSES")<StorageClassType>(),
  onDestroyed: createAction("ON_DESTROYED_K8S_STORAGE_CLASSES")<
    StorageClassType
  >()
};
export type storageClassActions = ActionType<typeof storageClassActions>;
export interface StorageClassState extends ResourceCache<StorageClassType> {}

const initialState: StorageClassState = {
  loaded: false,
  error: null,
  resources: []
};

export const storageClassesReducer = createReducer<
  StorageClassState,
  storageClassActions
>(initialState)
  .handleAction(
    storageClassActions.fetch.request,
    (state, _): StorageClassState => ({
      ...state,
      loaded: false
    })
  )
  .handleAction(
    storageClassActions.fetch.success,
    (state, action): StorageClassState => ({
      ...state,
      ...action.payload,
      error: null,
      loaded: true
    })
  )
  .handleAction(
    storageClassActions.fetch.failure,
    (state, action): StorageClassState => ({
      ...state,
      ...action.payload,
      loaded: false
    })
  )
  .handleAction(
    [storageClassActions.onUpdated, storageClassActions.onAdded],
    (state, action): StorageClassState => ({
      ...state,
      resources: [
        ...state.resources.filter(s => !isSameObject(s, action.payload)),
        action.payload
      ]
    })
  )
  .handleAction(
    storageClassActions.onDestroyed,
    (state, action): StorageClassState => ({
      ...state,
      resources: state.resources.filter(s => !isSameObject(s, action.payload))
    })
  );

export class StorageClass extends K8sResource {
  protected api: StorageV1Api;
  protected resource: V1StorageClass;

  constructor(resource: V1StorageClass, kubeConfig: KubeConfig) {
    super(resource, kubeConfig);

    this.resource = resource;
    this.api = kubeConfig.makeApiClient(StorageV1Api);
  }
  get spec(): V1StorageClass {
    return this.resource;
  }
  get namespace(): string {
    return "default";
  }
  static startInformer(
    kubeConfig: KubeConfig,
    channel: (input: unknown) => void
  ): () => void {
    const client = kubeConfig.makeApiClient(StorageV1Api);
    let cancelled = false;
    let request: Request;
    const watch = async () => {
      if (cancelled) {
        return;
      }
      try {
        const res = await client.listStorageClass();
        channel(
          storageClassActions.fetch.success({
            resources: res.body.items.map(r => new StorageClass(r, kubeConfig))
          })
        );
      } catch (error) {
        channel(storageClassActions.fetch.failure({ error }));
        log.warning("starting informer failed (will retry):  %s", error);
        return setTimeout(watch, 3000);
      }
      const informer = new Watch(kubeConfig);
      const watchHandler = (phase: string, obj: V1StorageClass) => {
        switch (phase) {
          case "ADDED":
            channel(
              storageClassActions.onAdded(new StorageClass(obj, kubeConfig))
            );
            break;
          case "MODIFIED":
            channel(
              storageClassActions.onUpdated(new StorageClass(obj, kubeConfig))
            );
            break;
          case "DELETED":
            channel(
              storageClassActions.onDestroyed(new StorageClass(obj, kubeConfig))
            );
            break;
        }
      };
      request = await informer.watch(
        "/apis/storage.k8s.io/v1/storageclasses",
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
    body: V1StorageClass;
  }> {
    return this.api.createStorageClass(this.resource);
  }
  read(): Promise<{
    response: IncomingMessage;
    body: V1StorageClass;
  }> {
    return this.api.readStorageClass(this.name);
  }
  update(): Promise<{
    response: IncomingMessage;
    body: V1StorageClass;
  }> {
    return this.api.patchStorageClass(
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
    return this.api.deleteStorageClass(this.name);
  }
}
