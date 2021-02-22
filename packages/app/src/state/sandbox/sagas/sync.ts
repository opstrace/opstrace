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
import {
  select,
  put,
  call,
  take,
  fork,
  cancelled,
  actionChannel
} from "redux-saga/effects";
import { eventChannel, EventChannel } from "redux-saga";
import { ActionType, isActionOf } from "typesafe-actions";

import * as actions from "../actions";
import { getSandbox } from "../hooks/useSandboxState";
import { Sandbox } from "../types";

type Actions = ActionType<typeof actions>;

// All actions to sync through to the sandbox
const isAllowedSandboxAction = isActionOf(Object.values(actions));

export function* executeActionsChannel(channel: any) {
  // create a local reference inside the fork
  const chan = channel;

  try {
    while (true) {
      // pull next from channel
      const action: Actions = yield take(chan);
      if (!action.type || !isAllowedSandboxAction(action)) {
        continue;
      }
      // dispatch action
      yield put(action);
    }
  } finally {
    // If task cancelled, close the channel
    if (yield cancelled()) {
      chan.close();
    }
  }
}

function send(action: Actions, client?: Window) {
  action.payload.origin = getOrigin();
  // scrub action of any fields we don't want to send
  if ("client" in action.payload) {
    delete action.payload.client;
  }
  client?.postMessage(action, "*");
}

/**
 * sandboxManager keeps a Parent & Sandbox state in sync by redispatching actions
 */
export default function* sandboxManager() {
  const channel = yield call(sandboxEventListenerChannel);
  // Fork the sandbox listener task
  yield fork(executeActionsChannel, channel);

  const requestChan = yield actionChannel((action: any) =>
    isAllowedSandboxAction(action)
  );

  if (process.env.RUNTIME === "sandbox") {
    yield put(actions.sandboxReady({}));
  }
  /* eslint-disable-next-line no-restricted-globals */
  let client = process.env.RUNTIME === "sandbox" ? parent : undefined;

  while (true) {
    const action: Actions = yield take(requestChan);

    if (action.payload.origin && action.payload.origin !== getOrigin()) {
      // came from the client
      if (
        process.env.RUNTIME !== "sandbox" &&
        isActionOf(actions.sandboxReady, action)
      ) {
        const sandboxState: Sandbox = yield select(getSandbox);
        if (!sandboxState.moduleUri) {
          continue;
        }
        yield send(
          actions.initSandbox({ uri: sandboxState.moduleUri }),
          client
        );
      }
      continue;
    }

    if (
      isActionOf(actions.initSandbox, action) &&
      process.env.RUNTIME !== "sandbox"
    ) {
      client = action.payload.client;
    }

    if (isActionOf(actions.disposeSandbox, action)) {
      client = undefined;
      continue;
    }

    send(action, client);
  }
}

function getOrigin(): actions.Origin {
  return process.env.RUNTIME === "sandbox" ? "sandbox" : "parent";
}

/**
 * Handle messages recieved
 */
export function sandboxEventListenerChannel(): EventChannel<Actions> {
  return eventChannel(emitter => {
    const handler = (ev: MessageEvent<any>) => {
      const action = ev.data as Actions;
      emitter(action);
    };
    /* eslint-disable-next-line no-restricted-globals */
    self.addEventListener("message", handler);
    return () => {
      /* eslint-disable-next-line no-restricted-globals */
      self.removeEventListener("message", handler);
    };
  });
}
