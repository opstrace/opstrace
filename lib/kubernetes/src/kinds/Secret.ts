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
  V1Secret,
  CoreV1Api,
  V1Status,
  KubeConfig,
  Watch
} from "@kubernetes/client-node";
import { K8sResource, isSameObject, ResourceCache } from "../common";
import { IncomingMessage } from "http";
import { log } from "@opstrace/utils";

export type SecretType = Secret;
export type Secrets = SecretType[];

export const isSecret = <(r: K8sResource) => r is SecretType>(
  (resource => resource instanceof Secret)
);

export const secretActions = {
  fetch: createAsyncAction(
    "FETCH_K8S_SECRETS_REQUEST",
    "FETCH_K8S_SECRETS_SUCCESS",
    "FETCH_K8S_SECRETS_FAILURE"
  )<Record<string, unknown>, { resources: Secrets }, { error: Error }>(),
  onUpdated: createAction("ON_UPDATED_K8S_SECRETS")<SecretType>(),
  onAdded: createAction("ON_ADDED_K8S_SECRETS")<SecretType>(),
  onDestroyed: createAction("ON_DESTROYED_K8S_SECRETS")<SecretType>()
};
export type SecretActions = ActionType<typeof secretActions>;
export type SecretState = ResourceCache<SecretType>;

const initialState: SecretState = {
  loaded: false,
  error: null,
  resources: []
};

export const secretsReducer = createReducer<SecretState, SecretActions>(
  initialState
)
  .handleAction(
    secretActions.fetch.request,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (state, _): SecretState => ({
      ...state,
      loaded: false
    })
  )
  .handleAction(
    secretActions.fetch.success,
    (state, action): SecretState => ({
      ...state,
      ...action.payload,
      error: null,
      loaded: true
    })
  )
  .handleAction(
    secretActions.fetch.failure,
    (state, action): SecretState => ({
      ...state,
      ...action.payload,
      loaded: false
    })
  )
  .handleAction(
    [secretActions.onUpdated, secretActions.onAdded],
    (state, action): SecretState => ({
      ...state,
      resources: [
        ...state.resources.filter(s => !isSameObject(s, action.payload)),
        action.payload
      ]
    })
  )
  .handleAction(
    secretActions.onDestroyed,
    (state, action): SecretState => ({
      ...state,
      resources: state.resources.filter(s => !isSameObject(s, action.payload))
    })
  );
export class Secret extends K8sResource {
  protected api: CoreV1Api;
  protected resource: V1Secret;

  constructor(resource: V1Secret, kubeConfig: KubeConfig) {
    super(resource, kubeConfig);

    this.resource = resource;
    this.api = kubeConfig.makeApiClient(CoreV1Api);
  }
  get data(): V1Secret["data"] {
    return this.resource.data;
  }
  get spec(): V1Secret {
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
        const res = await client.listSecretForAllNamespaces();
        channel(
          secretActions.fetch.success({
            resources: res.body.items.map(r => new Secret(r, kubeConfig))
          })
        );
      } catch (error) {
        channel(secretActions.fetch.failure({ error }));
        log.warning("starting informer failed (will retry):  %s", error);
        return setTimeout(watch, 3000);
      }
      const informer = new Watch(kubeConfig);
      const watchHandler = (phase: string, obj: V1Secret) => {
        switch (phase) {
          case "ADDED":
            channel(secretActions.onAdded(new Secret(obj, kubeConfig)));
            break;
          case "MODIFIED":
            channel(secretActions.onUpdated(new Secret(obj, kubeConfig)));
            break;
          case "DELETED":
            channel(secretActions.onDestroyed(new Secret(obj, kubeConfig)));
            break;
        }
      };
      request = await informer.watch(
        "/api/v1/secrets",
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
    body: V1Secret;
  }> {
    return this.api.createNamespacedSecret(this.namespace, this.resource);
  }
  read(): Promise<{
    response: IncomingMessage;
    body: V1Secret;
  }> {
    return this.api.readNamespacedSecret(this.name, this.namespace);
  }
  update(): Promise<{
    response: IncomingMessage;
    body: V1Secret;
  }> {
    return this.api.patchNamespacedSecret(
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
    return this.api.deleteNamespacedSecret(this.name, this.namespace);
  }
}
