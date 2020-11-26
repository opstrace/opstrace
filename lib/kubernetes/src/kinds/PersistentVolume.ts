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
  CoreV1Api,
  V1PersistentVolume,
  KubeConfig,
  Watch
} from "@kubernetes/client-node";
import { K8sResource, isSameObject, ResourceCache } from "../common";
import { IncomingMessage } from "http";
import { log } from "@opstrace/utils";

export type PersistentVolumeType = PersistentVolume;
export type PersistentVolumes = PersistentVolumeType[];

export const isPersistentVolume = <
  (r: K8sResource) => r is PersistentVolumeType
>(resource => resource instanceof PersistentVolume);

export const persistentVolumeActions = {
  fetch: createAsyncAction(
    "FETCH_K8S_PERSISTENT_VOLUMES_REQUEST",
    "FETCH_K8S_PERSISTENT_VOLUMES_SUCCESS",
    "FETCH_K8S_PERSISTENT_VOLUMES_FAILURE"
  )<{}, { resources: PersistentVolumes }, { error: Error }>(),
  onUpdated: createAction("ON_UPDATED_K8S_PERSISTENT_VOLUMES")<
    PersistentVolumeType
  >(),
  onAdded: createAction("ON_ADDED_K8S_PERSISTENT_VOLUMES")<
    PersistentVolumeType
  >(),
  onDestroyed: createAction("ON_DESTROYED_K8S_PERSISTENT_VOLUMES")<
    PersistentVolumeType
  >()
};
export type PersistentVolumeActions = ActionType<
  typeof persistentVolumeActions
>;
export interface PersistentVolumeState
  extends ResourceCache<PersistentVolumeType> {}

const initialState: PersistentVolumeState = {
  loaded: false,
  error: null,
  resources: []
};

export const persistentVolumesReducer = createReducer<
  PersistentVolumeState,
  PersistentVolumeActions
>(initialState)
  .handleAction(
    persistentVolumeActions.fetch.request,
    (state, _): PersistentVolumeState => ({
      ...state,
      loaded: false
    })
  )
  .handleAction(
    persistentVolumeActions.fetch.success,
    (state, action): PersistentVolumeState => ({
      ...state,
      ...action.payload,
      error: null,
      loaded: true
    })
  )
  .handleAction(
    persistentVolumeActions.fetch.failure,
    (state, action): PersistentVolumeState => ({
      ...state,
      ...action.payload,
      loaded: false
    })
  )
  .handleAction(
    [persistentVolumeActions.onUpdated, persistentVolumeActions.onAdded],
    (state, action): PersistentVolumeState => ({
      ...state,
      resources: [
        ...state.resources.filter(s => !isSameObject(s, action.payload)),
        action.payload
      ]
    })
  )
  .handleAction(
    persistentVolumeActions.onDestroyed,
    (state, action): PersistentVolumeState => ({
      ...state,
      resources: state.resources.filter(s => !isSameObject(s, action.payload))
    })
  );

const api = CoreV1Api;

export class PersistentVolume extends K8sResource {
  protected api: CoreV1Api;
  protected resource: V1PersistentVolume;

  constructor(resource: V1PersistentVolume, kubeConfig: KubeConfig) {
    super(resource, kubeConfig);

    this.resource = resource;
    this.api = kubeConfig.makeApiClient(api);
  }
  get spec(): V1PersistentVolume {
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
        const res = await client.listPersistentVolume();
        channel(
          persistentVolumeActions.fetch.success({
            resources: res.body.items.map(
              r => new PersistentVolume(r, kubeConfig)
            )
          })
        );
      } catch (error) {
        channel(persistentVolumeActions.fetch.failure({ error }));
        log.warning("starting informer failed (will retry):  %s", error);
        return setTimeout(watch, 3000);
      }
      const informer = new Watch(kubeConfig);
      const watchHandler = (phase: string, obj: V1PersistentVolume) => {
        switch (phase) {
          case "ADDED":
            channel(
              persistentVolumeActions.onAdded(
                new PersistentVolume(obj, kubeConfig)
              )
            );
            break;
          case "MODIFIED":
            channel(
              persistentVolumeActions.onUpdated(
                new PersistentVolume(obj, kubeConfig)
              )
            );
            break;
          case "DELETED":
            channel(
              persistentVolumeActions.onDestroyed(
                new PersistentVolume(obj, kubeConfig)
              )
            );
            break;
        }
      };
      request = await informer.watch(
        "/api/v1/persistentvolumes",
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
    body: V1PersistentVolume;
  }> {
    return this.api.createPersistentVolume(this.resource);
  }
  read(): Promise<{
    response: IncomingMessage;
    body: V1PersistentVolume;
  }> {
    return this.api.readPersistentVolume(this.name);
  }
  update(): Promise<{
    response: IncomingMessage;
    body: V1PersistentVolume;
  }> {
    return this.api.patchPersistentVolume(
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
    body: V1PersistentVolume;
  }> {
    return this.api.deletePersistentVolume(this.name);
  }
}
