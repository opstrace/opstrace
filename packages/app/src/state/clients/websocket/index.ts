import { io } from "socket.io-client";
import { ActionType } from "typesafe-actions";

import * as actions from "state/clients/websocket/actions";

const socket = io({ path: "/_/socket", transports: ["websocket"] });

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
