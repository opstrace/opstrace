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

import { call } from "redux-saga/effects";

import { Tenants } from "../types";
import { serialize, deserialize } from "../utils";
import {
  KubeConfiguration,
  ConfigMap,
  createOrUpdateCM
} from "@opstrace/kubernetes";

/**
 * Fetch Tenants
 */
export function* fetch(kubeConfig: KubeConfiguration) {
  const cm = serialize([], kubeConfig);
  const v1ConfigMap = yield call([cm, cm.read]);

  return deserialize(new ConfigMap(v1ConfigMap.body, kubeConfig));
}

export function* set(tenants: Tenants, kubeConfig: KubeConfiguration) {
  const cm = serialize(tenants, kubeConfig);
  yield call(createOrUpdateCM, cm);
}
