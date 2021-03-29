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

import { log, keyIDfromPEM } from "@opstrace/utils";

import {
    ControllerConfigSchemaV1,
    ControllerConfigTypeV1
} from "./schemav1";
import {
    ControllerConfigSchemaV2,
    ControllerConfigTypeV2
 } from "./schemav2";

export type LatestControllerConfigType = ControllerConfigTypeV2;
export const LatestControllerConfigSchema = ControllerConfigSchemaV2;

function generateAuthenticatorPubkeySetJSON(data_api_authn_pubkey_pem: string) {
  // The key set is required to be a mapping between keyID (string) and
  // PEM-encoded pubkey (string).
  // Note: upon _continutation_, this key should be added to the existing
  // key set.
  const keyId = keyIDfromPEM(data_api_authn_pubkey_pem);
  const keyset = {
    [keyId]: data_api_authn_pubkey_pem
  };

  log.debug("built authenticator key ID: %s", keyId);

  // The corresponding configuration parameter value is expected to be a
  // string, namely the above `keyset` mapping in JSON-encoded form *without
  // literal newline chars*.
  const tenant_api_authenticator_pubkey_set_json = JSON.stringify(keyset);
  log.debug(
    "generated AuthenticatorPubkeySetJSON: %s",
    tenant_api_authenticator_pubkey_set_json
  );
  return tenant_api_authenticator_pubkey_set_json;
}

// upgrade function
function V1toV2(cfg: ControllerConfigTypeV1): ControllerConfigTypeV2 {
  const { logRetention, metricRetention, data_api_authn_pubkey_pem, ...restConfig } = cfg;
  const tenant_api_authenticator_pubkey_set_json = generateAuthenticatorPubkeySetJSON(data_api_authn_pubkey_pem);

  return {
    ...restConfig,
    logRetentionDays: logRetention,
    metricRetentionDays: metricRetention,
    tenant_api_authenticator_pubkey_set_json: tenant_api_authenticator_pubkey_set_json
  }
}

export function upgradeControllerConfigMapToLatest(json: object): LatestControllerConfigType {
  if (LatestControllerConfigSchema.isValidSync(json, { strict: true })) {
    // validate again, this time "only" to interpolate with defaults, see
    // https://github.com/jquense/yup/pull/961
    log.debug("got latest controller config version");
    return LatestControllerConfigSchema.validateSync(json);
  }

  if (ControllerConfigSchemaV1.isValidSync(json, {strict: true})) {
    log.debug("got v1 controller config, upgrading...");
    return V1toV2(ControllerConfigSchemaV1.validateSync(json));
  }

  // Possible user error. Parse again and it'll throw a meaningful error
  // message.
  return LatestControllerConfigSchema.validateSync(json, {strict: true});
}
