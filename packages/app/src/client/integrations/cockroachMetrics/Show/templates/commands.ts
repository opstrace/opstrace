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

// Returns the command for a user to locally deploy Kubernetes yaml content.
// This assumes the user has downloaded the file locally to a file named 'yamlFilename'.
export function deployK8sYaml(yamlFilename: string, tenantName: string): string {
  return `sed "s/__AUTH_TOKEN__/$(cat tenant-api-token-${tenantName})/g" ${yamlFilename} | kubectl apply -f -`;
}

// Returns the command for a user to locally delete k8sYaml() content.
// This assumes the user has downloaded the file locally to a file named 'yamlFilename'.
// This does not include deletion of the namespace, in case the user also has other things there.
export function deleteK8sYaml(yamlFilename: string): string {
  return `kubectl delete -f ${yamlFilename}`;
}

// Returns the command for a user to update the baremetal metrics agent config.
// This assumes the user has downloaded the file locally to a file named 'yamlFilename'.
export function renderBaremetalYaml(yamlFilename: string, tenantName: string): string {
  // TODO need to retest this - does this exact output work in the yaml?
  return `sed "s/__AUTH_TOKEN__/$(cat tenant-api-token-${tenantName})/g" ${yamlFilename} | sed "s/__NODE_ADDRESSES__/$(cockroach node status --format tsv --insecure | awk '{print $2}' | tail -n +2)/g"`;
}
