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

import { pluck, zipObj } from "ramda";

import { k8sLogsIntegration } from "./k8sLogs";
import { k8sMetricsIntegration } from "./k8sMetrics";
import { cloudwatchIntegration } from "./cloudwatch";
import { stackDriverIntegration } from "./stackDriver";
import { blackBoxIntegration } from "./blackBox";

import { IntegrationDefs, IntegrationDefRecords } from "./types";

export * from "./types";
export * from "./paths";

export const integrationsDefs: IntegrationDefs = [
  k8sMetricsIntegration,
  k8sLogsIntegration,
  cloudwatchIntegration,
  stackDriverIntegration,
  blackBoxIntegration
];

export const integrationDefRecords: IntegrationDefRecords = zipObj(
  pluck("kind", integrationsDefs),
  integrationsDefs
);

export default integrationsDefs;
