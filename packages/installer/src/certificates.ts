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

import {
  V1CertificaterequestResourceType,
  V1CertificateResourceType
} from "@opstrace/kubernetes";
import { log } from "@opstrace/utils";

//
// Note: workaround for https://github.com/opstrace/opstrace/issue/151 until
// https://github.com/jetstack/cert-manager/issues/3594 is resolved.
//
// If the https-cert certificate is in the failed state then delete it. The
// controller will recreate the resource thereby triggering a restart of the
// certificate request process.
//
// We also delete the CertificateRequest otherwise cert-manager will see that
// the certificate already has a request in flight and will not recreate it.
//
export function handleFailedCertificate(
  certificates: V1CertificateResourceType[],
  certificateRequests: V1CertificaterequestResourceType[]
) {
  log.debug("checking if certificate is in failed state");

  const cert = certificates.find(cert => {
    cert.spec.status?.conditions?.find(cond => {
      cond.message!.includes(`order is in "invalid" state`);
    });
  });

  const certRequest = certificateRequests.find(cert => {
    cert.name.startsWith(cert.name);
  });

  certRequest
    ?.delete()
    .catch(e =>
      log.debug(`error deleting certificate request ${certRequest.name}: ${e}`)
    )
    .finally(() => {
      log.debug(
        `deleted certificate request ${certRequest.name} in failed state: `
      );
    });

  cert
    ?.delete()
    .catch(e => log.debug(`error deleting certificate ${cert.name}: ${e}`))
    .finally(() => {
      log.debug("deleted certificate ${cert.name} in failed state");
    });
}
