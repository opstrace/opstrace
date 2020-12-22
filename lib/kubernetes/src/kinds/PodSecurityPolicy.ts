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
  PolicyV1beta1Api,
  V1Status,
  V1beta1PodSecurityPolicy,
  KubeConfig,
  Watch
} from "@kubernetes/client-node";
import { K8sResource, isSameObject, ResourceCache } from "../common";
import { IncomingMessage } from "http";
import { log } from "@opstrace/utils";

export type PodSecurityPolicyType = PodSecurityPolicy;
export type PodSecurityPolicies = PodSecurityPolicyType[];

export const isPodSecurityPolicy = <
  (r: K8sResource) => r is PodSecurityPolicyType
>(resource => resource instanceof PodSecurityPolicy);

export const podSecurityPolicyActions = {
  fetch: createAsyncAction(
    "FETCH_K8S_POD_SECURITY_POLICIES_REQUEST",
    "FETCH_K8S_POD_SECURITY_POLICIES_SUCCESS",
    "FETCH_K8S_POD_SECURITY_POLICIES_FAILURE"
  )<
    Record<string, unknown>,
    { resources: PodSecurityPolicies },
    { error: Error }
  >(),
  onUpdated: createAction("ON_UPDATED_K8S_POD_SECURITY_POLICIES")<
    PodSecurityPolicyType
  >(),
  onAdded: createAction("ON_ADDED_K8S_POD_SECURITY_POLICIES")<
    PodSecurityPolicyType
  >(),
  onDestroyed: createAction("ON_DESTROYED_K8S_POD_SECURITY_POLICIES")<
    PodSecurityPolicyType
  >()
};
export type PodSecurityPolicyActions = ActionType<
  typeof podSecurityPolicyActions
>;
export type PodSecurityPolicyState = ResourceCache<PodSecurityPolicyType>;

const initialState: PodSecurityPolicyState = {
  loaded: false,
  error: null,
  resources: []
};

export const podSecurityPoliciesReducer = createReducer<
  PodSecurityPolicyState,
  PodSecurityPolicyActions
>(initialState)
  .handleAction(
    podSecurityPolicyActions.fetch.request,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (state, _): PodSecurityPolicyState => ({
      ...state,
      loaded: false
    })
  )
  .handleAction(
    podSecurityPolicyActions.fetch.success,
    (state, action): PodSecurityPolicyState => ({
      ...state,
      ...action.payload,
      error: null,
      loaded: true
    })
  )
  .handleAction(
    podSecurityPolicyActions.fetch.failure,
    (state, action): PodSecurityPolicyState => ({
      ...state,
      ...action.payload,
      loaded: false
    })
  )
  .handleAction(
    [podSecurityPolicyActions.onUpdated, podSecurityPolicyActions.onAdded],
    (state, action): PodSecurityPolicyState => ({
      ...state,
      resources: [
        ...state.resources.filter(s => !isSameObject(s, action.payload)),
        action.payload
      ]
    })
  )
  .handleAction(
    podSecurityPolicyActions.onDestroyed,
    (state, action): PodSecurityPolicyState => ({
      ...state,
      resources: state.resources.filter(s => !isSameObject(s, action.payload))
    })
  );

export class PodSecurityPolicy extends K8sResource {
  protected api: PolicyV1beta1Api;
  protected resource: V1beta1PodSecurityPolicy;

  constructor(resource: V1beta1PodSecurityPolicy, kubeConfig: KubeConfig) {
    super(resource, kubeConfig);

    this.resource = resource;
    this.api = kubeConfig.makeApiClient(PolicyV1beta1Api);
  }
  get spec(): V1beta1PodSecurityPolicy {
    return this.resource;
  }
  get namespace(): string {
    return "default";
  }
  static startInformer(
    kubeConfig: KubeConfig,
    channel: (input: unknown) => void
  ): () => void {
    const client = kubeConfig.makeApiClient(PolicyV1beta1Api);
    let cancelled = false;
    let request: Request;
    const watch = async () => {
      if (cancelled) {
        return;
      }
      try {
        const res = await client.listPodSecurityPolicy();
        channel(
          podSecurityPolicyActions.fetch.success({
            resources: res.body.items.map(
              r => new PodSecurityPolicy(r, kubeConfig)
            )
          })
        );
      } catch (error) {
        channel(podSecurityPolicyActions.fetch.failure({ error }));
        log.warning("starting informer failed (will retry):  %s", error);
        return setTimeout(watch, 3000);
      }
      const informer = new Watch(kubeConfig);
      const watchHandler = (phase: string, obj: V1beta1PodSecurityPolicy) => {
        switch (phase) {
          case "ADDED":
            channel(
              podSecurityPolicyActions.onAdded(
                new PodSecurityPolicy(obj, kubeConfig)
              )
            );
            break;
          case "MODIFIED":
            channel(
              podSecurityPolicyActions.onUpdated(
                new PodSecurityPolicy(obj, kubeConfig)
              )
            );
            break;
          case "DELETED":
            channel(
              podSecurityPolicyActions.onDestroyed(
                new PodSecurityPolicy(obj, kubeConfig)
              )
            );
            break;
        }
      };
      request = await informer.watch(
        "/apis/extensions/v1beta1/podsecuritypolicies",
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
    body: V1beta1PodSecurityPolicy;
  }> {
    return this.api.createPodSecurityPolicy(this.resource);
  }
  read(): Promise<{
    response: IncomingMessage;
    body: V1beta1PodSecurityPolicy;
  }> {
    return this.api.readPodSecurityPolicy(this.name);
  }
  update(): Promise<{
    response: IncomingMessage;
    body: V1beta1PodSecurityPolicy;
  }> {
    return this.api.patchPodSecurityPolicy(
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
    return this.api.deletePodSecurityPolicy(this.name);
  }
}
