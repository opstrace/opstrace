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
import Logo from "./Logo.jpg";

import { IntegrationDef } from "client/integrations/types";

import { EARLY_PREVIEW } from "client/flags";

export const exporterStackdriverIntegration: IntegrationDef = {
  kind: "exporter-stackdriver",
  category: "exporter",
  label: "Google Stackdriver",
  desc:
    "A Prometheus exporter for Google Stackdriver Monitoring metrics. It acts as a proxy that requests Stackdriver API for the metric's time-series everytime prometheus scrapes it.",
  Form: Form,
  Show: Show,
  Status: Status,
  Logo: Logo,
  enabled: EARLY_PREVIEW
};
