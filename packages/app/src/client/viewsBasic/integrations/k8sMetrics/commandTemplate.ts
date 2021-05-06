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

// Returns the (optional) command for a user to create a namespace, if it doesn't already exist.
export function createNamespaceCommand(deployNamespace: String): String {
  return `kubectl create namespace ${deployNamespace}`;
}

// Returns the command for a user to locally access the prometheus instance over a port forward.
export function portforwardPrometheusCommand(tenantName: String, deployNamespace: String): String {
  return `kubectl port-forward -n ${deployNamespace} deployments/opstrace-prometheus`;
}

// Returns the command for a user to locally deploy either prometheusYaml() or promtailYaml() content.
// This assumes the user has downloaded the file locally to a file named 'yamlFilename'.
export function deployCommand(yamlFilename: String, tenantName: String): String {
  return `sed "s/__AUTH_TOKEN__/$(cat tenant-api-token-${tenantName})/g" ${yamlFilename} | kubectl apply -f -`;
}
