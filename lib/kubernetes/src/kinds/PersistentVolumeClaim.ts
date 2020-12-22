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
  V1PersistentVolumeClaim,
  KubeConfig,
  Watch
} from "@kubernetes/client-node";
import { K8sResource, isSameObject, ResourceCache } from "../common";
import { IncomingMessage } from "http";
import { log } from "@opstrace/utils";

export type PersistentVolumeClaimType = PersistentVolumeClaim;
export type PersistentVolumeClaims = PersistentVolumeClaimType[];

export const isPersistentVolumeClaim = <
  (r: K8sResource) => r is PersistentVolumeClaimType
>(resource => resource instanceof PersistentVolumeClaim);

export const persistentVolumeClaimActions = {
  fetch: createAsyncAction(
    "FETCH_K8S_PERSISTENT_VOLUME_CLAIMS_REQUEST",
    "FETCH_K8S_PERSISTENT_VOLUME_CLAIMS_SUCCESS",
    "FETCH_K8S_PERSISTENT_VOLUME_CLAIMS_FAILURE"
  )<
    Record<string, unknown>,
    { resources: PersistentVolumeClaims },
    { error: Error }
  >(),
  onUpdated: createAction("ON_UPDATED_K8S_PERSISTENT_VOLUME_CLAIMS")<
    PersistentVolumeClaimType
  >(),
  onAdded: createAction("ON_ADDED_K8S_PERSISTENT_VOLUME_CLAIMS")<
    PersistentVolumeClaimType
  >(),
  onDestroyed: createAction("ON_DESTROYED_K8S_PERSISTENT_VOLUME_CLAIMS")<
    PersistentVolumeClaimType
  >()
};
export type PersistentVolumeClaimActions = ActionType<
  typeof persistentVolumeClaimActions
>;
export type PersistentVolumeClaimState = ResourceCache<
  PersistentVolumeClaimType
>;

const initialState: PersistentVolumeClaimState = {
  loaded: false,
  error: null,
  resources: []
};

export const persistentVolumeClaimsReducer = createReducer<
  PersistentVolumeClaimState,
  PersistentVolumeClaimActions
>(initialState)
  .handleAction(
    persistentVolumeClaimActions.fetch.request,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (state, _): PersistentVolumeClaimState => ({
      ...state,
      loaded: false
    })
  )
  .handleAction(
    persistentVolumeClaimActions.fetch.success,
    (state, action): PersistentVolumeClaimState => ({
      ...state,
      ...action.payload,
      error: null,
      loaded: true
    })
  )
  .handleAction(
    persistentVolumeClaimActions.fetch.failure,
    (state, action): PersistentVolumeClaimState => ({
      ...state,
      ...action.payload,
      loaded: false
    })
  )
  .handleAction(
    [
      persistentVolumeClaimActions.onUpdated,
      persistentVolumeClaimActions.onAdded
    ],
    (state, action): PersistentVolumeClaimState => ({
      ...state,
      resources: [
        ...state.resources.filter(s => !isSameObject(s, action.payload)),
        action.payload
      ]
    })
  )
  .handleAction(
    persistentVolumeClaimActions.onDestroyed,
    (state, action): PersistentVolumeClaimState => ({
      ...state,
      resources: state.resources.filter(s => !isSameObject(s, action.payload))
    })
  );

const api = CoreV1Api;

export class PersistentVolumeClaim extends K8sResource {
  protected api: CoreV1Api;
  protected resource: V1PersistentVolumeClaim;

  constructor(resource: V1PersistentVolumeClaim, kubeConfig: KubeConfig) {
    super(resource, kubeConfig);

    this.resource = resource;
    this.api = kubeConfig.makeApiClient(api);
  }
  get spec(): V1PersistentVolumeClaim {
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
        const res = await client.listPersistentVolumeClaimForAllNamespaces();
        channel(
          persistentVolumeClaimActions.fetch.success({
            resources: res.body.items.map(
              r => new PersistentVolumeClaim(r, kubeConfig)
            )
          })
        );
      } catch (error) {
        channel(persistentVolumeClaimActions.fetch.failure({ error }));
        log.warning("starting informer failed (will retry):  %s", error);
        return setTimeout(watch, 3000);
      }
      const informer = new Watch(kubeConfig);
      const watchHandler = (phase: string, obj: V1PersistentVolumeClaim) => {
        switch (phase) {
          case "ADDED":
            channel(
              persistentVolumeClaimActions.onAdded(
                new PersistentVolumeClaim(obj, kubeConfig)
              )
            );
            break;
          case "MODIFIED":
            channel(
              persistentVolumeClaimActions.onUpdated(
                new PersistentVolumeClaim(obj, kubeConfig)
              )
            );
            break;
          case "DELETED":
            channel(
              persistentVolumeClaimActions.onDestroyed(
                new PersistentVolumeClaim(obj, kubeConfig)
              )
            );
            break;
        }
      };
      request = await informer.watch(
        "/api/v1/persistentvolumeclaims",
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
    body: V1PersistentVolumeClaim;
  }> {
    return this.api.createNamespacedPersistentVolumeClaim(
      this.namespace,
      this.resource
    );
  }
  read(): Promise<{
    response: IncomingMessage;
    body: V1PersistentVolumeClaim;
  }> {
    return this.api.readNamespacedPersistentVolumeClaim(
      this.name,
      this.namespace
    );
  }
  update(): Promise<{
    response: IncomingMessage;
    body: V1PersistentVolumeClaim;
  }> {
    return this.api.patchNamespacedPersistentVolumeClaim(
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
    body: V1PersistentVolumeClaim;
  }> {
    return this.api.deleteNamespacedPersistentVolumeClaim(
      this.name,
      this.namespace
    );
  }
}
