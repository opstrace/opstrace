/**
 * Copyright 2019-2021 Opstrace, Inc.
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

import { reducer as tenantReducer } from "@opstrace/tenants";
import { reducer as configReducer } from "@opstrace/controller-config";

import {
  statefulSetsReducer,
  secretsReducer,
  deploymentsReducer,
  daemonSetsReducer,
  configMapsReducer,
  V1CertificateReducer
} from "@opstrace/kubernetes";

export const rootReducers = {
  tenants: tenantReducer,
  kubernetes: combineReducers({
    cluster: combineReducers({
      StatefulSets: statefulSetsReducer,
      Secrets: secretsReducer,
      Deployments: deploymentsReducer,
      DaemonSets: daemonSetsReducer,
      ConfigMaps: configMapsReducer,
      Config: configReducer,
      Certificates: V1CertificateReducer
    })
  })
};

export const rootReducer = combineReducers(rootReducers);
export type State = ReturnType<typeof rootReducer>;
