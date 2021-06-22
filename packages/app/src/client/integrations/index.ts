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
import { exporterCloudWatchIntegration } from "./exporterCloudWatch";
import { exporterCloudMonitoringIntegration } from "./exporterCloudMonitoring";
import { exporterAzureIntegration } from "./exporterAzure";
import { syntheticMonitoringIntegration } from "./syntheticMonitoring";

import { IntegrationPlugins, IntegrationPluginRecords } from "./types";

export * from "./types";
export * from "./paths";

export const integrationPlugins: IntegrationPlugins = [
  k8sMetricsIntegration,
  k8sLogsIntegration,
  exporterCloudWatchIntegration,
  exporterCloudMonitoringIntegration,
  exporterAzureIntegration,
  syntheticMonitoringIntegration
];

export const integrationPluginRecords: IntegrationPluginRecords = zipObj(
  pluck("kind", integrationPlugins),
  integrationPlugins
);

export default integrationPlugins;
