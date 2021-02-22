/**
 * Copyright 2021 Opstrace, Inc.
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

import { io } from "socket.io-client";
import { ActionType } from "typesafe-actions";

import * as actions from "state/clients/websocket/actions";

const socket = io({
  path: "/_/socket",
  transports: ["websocket"],
  autoConnect: process.env.RUNTIME !== "sandbox"
});

export type WebsocketEvents = ActionType<typeof actions>;
type SubscriptionCallback = (action: WebsocketEvents) => void;
const subscribers = new Set<SubscriptionCallback>();

function listen(callback: SubscriptionCallback) {
  subscribers.add(callback);
}
function unlisten(callback: SubscriptionCallback) {
  subscribers.delete(callback);
}

socket.on("message", (action: WebsocketEvents) => {
  for (const sub of subscribers.values()) {
    sub(action);
  }
});

const websocket = {
  emit: (event: WebsocketEvents) => {
    socket.emit("message", event);
  },
  listen,
  unlisten
};

export default websocket;
