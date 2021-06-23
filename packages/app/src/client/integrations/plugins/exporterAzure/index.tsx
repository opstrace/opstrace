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

import { IntegrationPlugin } from "client/integrations/types";

export const exporterAzureIntegration: IntegrationPlugin = {
  kind: "exporter-azure",
  category: "exporter",
  label: "Microsoft Azure",
  desc:
    "Pipe any of your metrics from Microsoft Azure into Opstrace. You can select metrics from any of the Microsoft Azure Services such as Service Fabric or Load Balancer, as long as you've enabled monitoring on the service in the Microsoft Azure Console.",
  Form: Form,
  detailSections: Show,
  Status: Status,
  Logo: Logo
};
