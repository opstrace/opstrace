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

import { combineReducers } from "redux";
import { reducer as branchReducer } from "./branch/reducer";
import { reducer as moduleReducer } from "./module/reducer";
import { reducer as moduleVersionReducer } from "./moduleVersion/reducer";
import { reducer as fileReducer } from "./file/reducer";
import { reducer as userReducer } from "./user/reducer";
import { reducer as tenantReducer } from "./tenant/reducer";
import { reducer as alertManagerConfigReducer } from "./alertManagerConfig/reducer";
import { reducer as sandboxReducer } from "./sandbox/reducer";

export const mainReducers = {
  users: userReducer,
  files: fileReducer,
  tenants: tenantReducer,
  alertManagerConfig: alertManagerConfigReducer,
  branches: branchReducer,
  modules: moduleReducer,
  moduleVersions: moduleVersionReducer,
  sandbox: sandboxReducer
};

export const mainReducer = combineReducers(mainReducers);
export type State = ReturnType<typeof mainReducer>;
