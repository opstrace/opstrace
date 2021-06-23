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
import ShowSections from "./Show";
import Status from "./Status";
import Logo from "./Logo.png";

import { IntegrationPlugin } from "client/integrations/types";

/*
type Config = {
  // Definition of one or more probes to run against the modules
  // In practice, each probe entry should have the following params:
  // - "target": The endpoint to be queried, like "opstrace.com" or "1.1.1.1"
  // - "module": The name of the module to be exercised
  probes: { [key: string]: string }[],
  // Module configuration YAML content. Content should contain a root-level "modules" key.
  //   Docs: https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md#blackbox-exporter-configuration
  //   Example: https://github.com/prometheus/blackbox_exporter/blob/master/example.yml
  configFile: string | null,
}
type Data = {
  config: Config
}
*/

// example probes
/*
[
  { target: "prometheus.io", module: "http_2xx" },
  { target: "example.com", module: "http_2xx" },
  { target: "1.1.1.1", module: "dns_opstrace_mx" },
  { target: "8.8.8.8", module: "dns_opstrace_mx" }
];
*/

// example configFile content:
/*
modules:
  http_2xx:
    prober: http
    timeout: 5s
    http:
      preferred_ip_protocol: "ip4"
  dns_opstrace_mx:
    prober: dns
    timeout: 5s
    dns:
      preferred_ip_protocol: "ip4"
      transport_protocol: tcp
      dns_over_tls: true
      query_name: opstrace.com
      query_type: MX
*/

export const syntheticMonitoringIntegration: IntegrationPlugin = {
  kind: "synthetic-monitoring",
  category: "exporter",
  label: "Synthetic Monitoring",
  desc:
    "PLACEHOLDER: The blackbox exporter allows blackbox probing of endpoints over HTTP, HTTPS, DNS, TCP and ICMP.",
  Form: Form,
  detailSections: ShowSections,
  Status: Status,
  Logo: Logo
};
