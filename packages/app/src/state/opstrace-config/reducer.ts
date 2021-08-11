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

import * as Sentry from "@sentry/react";

import { createReducer, ActionType } from "typesafe-actions";

import { OpstraceConfig } from "./types";
import * as actions from "./actions";

type OpstraceConfigActions = ActionType<typeof actions>;

const OpstraceConfigInitialState: OpstraceConfig = {
  buildInfo: undefined
};

export const reducer = createReducer<OpstraceConfig, OpstraceConfigActions>(
  OpstraceConfigInitialState
).handleAction(
  actions.updateOpstraceBuildInfo,
  (state, action): OpstraceConfig => {
    const { buildInfo } = action.payload;

    Sentry.setTag("opstrace.branch", buildInfo.branch);
    Sentry.setTag("opstrace.version", buildInfo.version);
    Sentry.setTag("opstrace.commit", buildInfo.commit);
    Sentry.setTag("opstrace.build-time", buildInfo.buildTime);
    Sentry.setTag("opstrace.build-hostname", buildInfo.buildHostname);

    return {
      buildInfo
    };
  }
);
