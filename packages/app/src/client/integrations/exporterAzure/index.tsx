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

import Form from "./Form";
import Show from "./Show";
import Status from "./Status";
import Logo from "./Logo.png";

import { IntegrationDef } from "../types";

import { EARLY_PREVIEW } from "client/flags";

/*
// example credentials
// this is OPTIONAL - the user may instead provide credentials via the "credentials" section of the config yaml
type Credentials = {
  AZURE_SUBSCRIPTION_ID: "my-subscription-uuid",
  AZURE_TENANT_ID: "my-directory-uuid",
  AZURE_CLIENT_ID: "my-application-uuid",
  AZURE_CLIENT_SECRET: "my-app-client-secret"
}
type Data = {
  // overrides config.credentials if present
  credentials: Credentials | undefined,
  // YAML data. per above the "credentials" field can be omitted. example config:
  // see https://github.com/RobustPerception/azure_metrics_exporter#example-azure-metrics-exporter-config
  config: string
}
*/

export const exporterAzureIntegration: IntegrationDef = {
  kind: "exporter-azure",
  category: "exporter",
  label: "Microsoft Azure",
  desc:
    "Pipe any of your metrics from Microsoft Azure into Opstrace. You can select metrics from any of the Microsoft Azure Services such as Blog Storage or Load Balancer, as long as you've enabled monitoring on the service in the Microsoft Azure Console.",
  Form: Form,
  Show: Show,
  Status: Status,
  Logo: Logo,
  enabled: EARLY_PREVIEW
};
