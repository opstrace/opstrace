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

import { ControllerConfigSchemaV1, ControllerConfigTypeV1 } from "./schemav1";
import {
  ControllerConfigSchemaV1alpha,
  ControllerConfigTypeV1alpha
} from "./schemav1alpha";
import { ControllerConfigSchemaV2, ControllerConfigTypeV2 } from "./schemav2";
import { ControllerConfigSchemaV3, ControllerConfigTypeV3 } from "./schemav3";

import * as aks from "./aks";

export type LatestControllerConfigType = ControllerConfigTypeV3;
export const LatestControllerConfigSchema = ControllerConfigSchemaV3;

function V2toV3(cfg: ControllerConfigTypeV2): ControllerConfigTypeV3 {
  return {
    ...cfg,
    cliMetadata: {
      allCLIVersions: []
    }
  };
}

// upgrade function
function V1toV2(cfg: ControllerConfigTypeV1): ControllerConfigTypeV2 {
  const {
    logRetention,
    metricRetention,
    data_api_authn_pubkey_pem,
    ...restConfig
  } = cfg;

  // Generate the tenant/data API authenticator keyset from the single, initial
  // known public key.
  const tenant_api_authenticator_pubkey_set_json = aks.authenticatorKeySetgenerateJSONSingleKey(
    data_api_authn_pubkey_pem
  );

  return {
    ...restConfig,
    logRetentionDays: logRetention,
    metricRetentionDays: metricRetention,
    // Legacy auth tokens don't encode a key id so set up legacy env var to
    // continue to support older tokens.
    data_api_authn_pubkey_pem: data_api_authn_pubkey_pem,
    tenant_api_authenticator_pubkey_set_json: tenant_api_authenticator_pubkey_set_json
  };
}

function V1alphatoV2(cfg: ControllerConfigTypeV1alpha): ControllerConfigTypeV2 {
  const { logRetention, metricRetention, ...restConfig } = cfg;

  return {
    ...restConfig,
    logRetentionDays: logRetention,
    metricRetentionDays: metricRetention
  };
}

export function upgradeControllerConfigMapToLatest(
  json: object
): LatestControllerConfigType {
  if (LatestControllerConfigSchema.isValidSync(json, { strict: true })) {
    // validate again, this time "only" to interpolate with defaults, see
    // https://github.com/jquense/yup/pull/961
    log.debug("got latest controller config version");
    return LatestControllerConfigSchema.validateSync(json);
  }

  let cfgV2: ControllerConfigTypeV2 | undefined;
  if (ControllerConfigSchemaV1.isValidSync(json, { strict: true })) {
    log.debug("got v1 controller config, upgrading...");
    cfgV2 = V1toV2(ControllerConfigSchemaV1.validateSync(json));
  } else if (
    ControllerConfigSchemaV1alpha.isValidSync(json, { strict: true })
  ) {
    log.debug("got v1alpha controller config, upgrading...");
    cfgV2 = V1alphatoV2(ControllerConfigSchemaV1alpha.validateSync(json));
  } else if (ControllerConfigSchemaV2.isValidSync(json, { strict: true })) {
    log.debug("got v2 controller config, upgrading...");
    cfgV2 = ControllerConfigSchemaV2.validateSync(json);
  }

  if (cfgV2 !== undefined) {
    log.debug("upgrading from v2 to v3");
    return V2toV3(cfgV2);
  }

  log.debug(
    "no valid controller config schema found, attempting sync with latest"
  );

  // Possible user error. Parse again and it'll throw a meaningful error
  // message.
  return LatestControllerConfigSchema.validateSync(json, { strict: true });
}
