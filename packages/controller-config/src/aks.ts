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

import { log, keyIDfromPEM, die } from "@opstrace/utils";

export function authenticatorKeySetAddKey(
  previousKeySetJSONString: string,
  newPubkeyPem: string
): string {
  const previousKeySet = JSON.parse(previousKeySetJSONString);
  const newKeyID = keyIDfromPEM(newPubkeyPem);
  if (newKeyID in previousKeySet) {
    die("key already in key set");
  }
  const newKeySet = {
    ...previousKeySet,
    newKeyID: newPubkeyPem
  };
  return JSON.stringify(newKeySet);
}

export function authenticatorKeySetgenerateJSONSingleKey(
  pubkeyPem: string
): string {
  // The key set is required to be a mapping between keyID (string) and
  // PEM-encoded pubkey (string).
  // Note: upon _continutation_, this key should be added to the existing
  // key set.
  const keyId = keyIDfromPEM(pubkeyPem);
  const keyset = {
    [keyId]: pubkeyPem
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
