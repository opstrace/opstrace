/**
 * Copyright 2020 Opstrace, Inc.
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

import { V1CertificateResourceType } from "../custom-resources";

export function getCertificateRolloutMessage(
  c: V1CertificateResourceType
): string {
  const certificate = c.spec!;
  const status = certificate.status!;

  for (const c of status.conditions!) {
    if (c.reason == "Ready" && c.status == "True" && c.type == "Ready") {
      // certificate is ready
      return "";
    }
  }

  return `Waiting for Certificate ${c.namespace}/${c.name} to be ready`;
}
