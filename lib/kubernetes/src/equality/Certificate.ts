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

import { log } from "@opstrace/utils";
import { isDeepStrictEqual } from "util";
import { V1Certificate } from "../custom-resources";

export const isCertificateEqual = (
  desired: V1Certificate,
  existing: V1Certificate
): boolean => {
  if (typeof desired.spec !== typeof existing.spec) {
    return false;
  }

  if (
    !isDeepStrictEqual(
      desired.metadata?.annotations,
      existing.metadata?.annotations
    )
  ) {
    log.debug(
      `annotations mismatch: ${JSON.stringify(
        desired.metadata?.annotations
      )} vs ${existing.metadata?.annotations}`
    );
    return false;
  }

  if (desired.spec.commonName !== existing.spec.commonName) {
    log.debug(
      `commonName mismatch:  ${desired.spec.commonName} vs ${existing.spec.commonName}`
    );
    return false;
  }

  if (!isDeepStrictEqual(desired.spec.dnsNames, existing.spec.dnsNames)) {
    log.debug(
      `dnsNames mismatch:  ${desired.spec.dnsNames} vs ${existing.spec.dnsNames}`
    );
    return false;
  }

  if (desired.spec.isCA !== existing.spec.isCA) {
    log.debug(`isCA mismatch:  ${desired.spec.isCA} vs ${existing.spec.isCA}`);
    return false;
  }

  if (!isDeepStrictEqual(desired.spec.issuerRef, existing.spec.issuerRef)) {
    log.debug(
      `issuerRef mismatch:  ${desired.spec.issuerRef} vs ${existing.spec.issuerRef}`
    );
    return false;
  }

  if (desired.spec.secretName !== existing.spec.secretName) {
    log.debug(
      `secretName mismatch:  ${desired.spec.secretName} vs ${existing.spec.secretName}`
    );
    return false;
  }

  return true;
};
