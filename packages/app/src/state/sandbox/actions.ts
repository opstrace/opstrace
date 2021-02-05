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
import { createAction } from "typesafe-actions";

export type Origin = "parent" | "sandbox";
/**
 *
 * IMPORTANT: prefix all sandbox actions with "SANDBOX_" so we can easily filter
 * for these actions and forward to/from the sandbox.
 *
 * Also add an origin to all actions.
 *
 */
export const initSandbox = createAction("SANDBOX_INIT")<{
  uri: string;
  client?: Window;
  origin?: Origin;
}>();
export const hmrSandboxUpdate = createAction("SANDBOX_HMR_UPDATE")<{
  origin?: Origin;
}>();
export const disposeSandbox = createAction("SANDBOX_DISPOSE")<{
  origin?: Origin;
}>();
export const sandboxReady = createAction("SANDBOX_READY")<{
  origin?: Origin;
}>();
