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

import { ExporterCloudwatchForm } from "./Form";
import { ExporterCloudwatchShow } from "./Show";
import ExporterCloudwatchStatus from "./Status";
import ExporterCloudwatchLogo from "./Logo.png";

import { IntegrationDef } from "../types";

export const exporterCloudwatchIntegration: IntegrationDef = {
  kind: "exporter-cloudwatch",
  category: "exporter",
  label: "Amazon Cloudwatch",
  desc: "Amazon Cloudwatch Exporter description goes here",
  Form: ExporterCloudwatchForm,
  Show: ExporterCloudwatchShow,
  Status: ExporterCloudwatchStatus,
  enabled: true,
  Logo: ExporterCloudwatchLogo
};
