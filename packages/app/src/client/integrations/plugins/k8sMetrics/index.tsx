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

import { K8sMetricsForm } from "./Form";
import K8sMetricsShow from "./Show";
import K8sMetricsLogo from "./Logo.png";

import { IntegrationPlugin, IntegrationProps } from "client/integrations/types";

import * as grafana from "client/utils/grafana";

const uninstallCallback = async ({ integration, tenant }: IntegrationProps) => {
  try {
    await grafana.deleteFolder({ integration, tenant });
  } catch (err) {
    console.log(err);
  }
};

export const k8sMetricsIntegration: IntegrationPlugin = {
  kind: "k8s-metrics",
  category: "infrastructure",
  label: "Kubernetes Metrics",
  desc:
    "Generate all the yaml required to send metrics from your Kubernetes cluster to this tenant. We'll install bundled dashboards for monitoring Kubernetes with this integration.",
  Form: K8sMetricsForm,
  detailSections: K8sMetricsShow,
  status: {
    started: {},
    error: {}
  },
  Logo: K8sMetricsLogo,
  uninstallCallback: uninstallCallback
};
