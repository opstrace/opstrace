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

import { combineReducers } from "redux";

import {
  statefulSetsReducer,
  persistentVolumesReducer,
  deploymentsReducer,
  daemonSetsReducer,
  configMapsReducer,
  V1CertificateReducer
} from "@opstrace/kubernetes";

export const rootReducers = {
  kubernetes: combineReducers({
    cluster: combineReducers({
      StatefulSets: statefulSetsReducer,
      Deployments: deploymentsReducer,
      DaemonSets: daemonSetsReducer,
      PersistentVolumes: persistentVolumesReducer,
      ConfigMaps: configMapsReducer,
      Certificates: V1CertificateReducer
    })
  })
};

export const rootReducer = combineReducers(rootReducers);
export type State = ReturnType<typeof rootReducer>;
