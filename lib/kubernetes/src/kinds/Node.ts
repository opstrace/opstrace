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
  V1Status,
  V1Node,
  Watch,
  KubeConfig
} from "@kubernetes/client-node";
import { K8sResource, isSameObject, ResourceCache } from "../common";
import { IncomingMessage } from "http";
import { log } from "@opstrace/utils";

export type NodeType = Node;
export type Nodes = NodeType[];

export const isNode = <(r: K8sResource) => r is NodeType>(
  (resource => resource instanceof Node)
);

export const nodeActions = {
  fetch: createAsyncAction(
    "FETCH_K8S_NODES_REQUEST",
    "FETCH_K8S_NODES_SUCCESS",
    "FETCH_K8S_NODES_FAILURE"
  )<{}, { resources: Nodes }, { error: Error }>(),
  onUpdated: createAction("ON_UPDATED_K8S_NODES")<NodeType>(),
  onAdded: createAction("ON_ADDED_K8S_NODES")<NodeType>(),
  onDestroyed: createAction("ON_DESTROYED_K8S_NODES")<NodeType>()
};
export type NodeActions = ActionType<typeof nodeActions>;
export interface NodeState extends ResourceCache<NodeType> {}

const initialState: NodeState = {
  loaded: false,
  error: null,
  resources: []
};

export const nodesReducer = createReducer<NodeState, NodeActions>(initialState)
  .handleAction(
    nodeActions.fetch.request,
    (state, _): NodeState => ({
      ...state,
      loaded: false
    })
  )
  .handleAction(
    nodeActions.fetch.success,
    (state, action): NodeState => ({
      ...state,
      ...action.payload,
      error: null,
      loaded: true
    })
  )
  .handleAction(
    nodeActions.fetch.failure,
    (state, action): NodeState => ({
      ...state,
      ...action.payload,
      loaded: false
    })
  )
  .handleAction(
    [nodeActions.onUpdated, nodeActions.onAdded],
    (state, action): NodeState => ({
      ...state,
      resources: [
        ...state.resources.filter(s => !isSameObject(s, action.payload)),
        action.payload
      ]
    })
  )
  .handleAction(
    nodeActions.onDestroyed,
    (state, action): NodeState => ({
      ...state,
      resources: state.resources.filter(s => !isSameObject(s, action.payload))
    })
  );

export class Node extends K8sResource {
  protected api: CoreV1Api;
  protected resource: V1Node;

  constructor(resource: V1Node, kubeConfig: KubeConfig) {
    super(resource, kubeConfig);

    this.resource = resource;
    this.api = kubeConfig.makeApiClient(CoreV1Api);
  }
  get spec(): V1Node {
    return this.resource;
  }
  get namespace(): string {
    return "default";
  }
  static startInformer(
    kubeConfig: KubeConfig,
    channel: (input: unknown) => void
  ): () => void {
    const client = kubeConfig.makeApiClient(CoreV1Api);
    let cancelled = false;
    let request: Request;
    const watch = async () => {
      if (cancelled) {
        return;
      }
      try {
        const res = await client.listNode();
        channel(
          nodeActions.fetch.success({
            resources: res.body.items.map(r => new Node(r, kubeConfig))
          })
        );
      } catch (error) {
        channel(nodeActions.fetch.failure({ error }));
        log.warning("starting informer failed (will retry):  %s", error);
        return setTimeout(watch, 3000);
      }
      const informer = new Watch(kubeConfig);
      const watchHandler = (phase: string, obj: V1Node) => {
        switch (phase) {
          case "ADDED":
            channel(nodeActions.onAdded(new Node(obj, kubeConfig)));
            break;
          case "MODIFIED":
            channel(nodeActions.onUpdated(new Node(obj, kubeConfig)));
            break;
          case "DELETED":
            channel(nodeActions.onDestroyed(new Node(obj, kubeConfig)));
            break;
        }
      };
      request = await informer.watch(
        "/api/v1/nodes",
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
    body: V1Node;
  }> {
    return this.api.createNode(this.resource);
  }
  read(): Promise<{
    response: IncomingMessage;
    body: V1Node;
  }> {
    return this.api.readNode(this.name);
  }
  update(): Promise<{
    response: IncomingMessage;
    body: V1Node;
  }> {
    return this.api.patchNode(
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
    return this.api.deleteNode(this.name);
  }
}
