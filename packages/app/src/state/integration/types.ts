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

import { Integration as DBIntegration } from "state/clients/graphqlClient";

export type Integration = Pick<
  DBIntegration,
  | "id"
  | "tenant_id"
  | "name"
  | "key"
  | "kind"
  | "data"
  | "created_at"
  | "updated_at"
> & { grafana?: IntegrationGrafana };

export type Integrations = Integration[];
export type IntegrationRecords = Record<string, Integration>;

export type IntegrationGrafana = {
  folder?: IntegrationGrafanaFolder;
  status?: "pending" | "active" | "error" | "unknown";
};

export type IntegrationGrafanaFolder = {
  id?: number;
  path?: string;
};
// use this same id to unsubscribe
export type SubscriptionID = number;

export type IntegrationStatus = "pending" | "active" | "error" | "unknown";
export type IntegrationStatusRecords = Record<string, IntegrationStatus>;

export const INTEGRATION_STATUS: IntegrationStatusRecords = {
  pending: "pending",
  active: "active",
  error: "error",
  unknown: "unknown"
};
