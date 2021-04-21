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

import crypto from "crypto";
import fs from "fs";

import { log, die } from "@opstrace/utils";

import * as cli from "./index";
// import * as util from "./util";
import * as cryp from "./crypto";

export async function create(): Promise<void> {
  const keypair: cryp.RSAKeypair = readKeyPairRSAfromPEM();

  const token = cryp.generateJWTforTenantAPIfromKeyPair(
    cli.CLIARGS.tenantName,
    cli.CLIARGS.clusterName,
    keypair
  );

  log.info(
    "be sure that the Opstrace API authenticator has this public key in its key set:\n%s",
    keypair.pubkeyPem
  );
  process.stderr.write("\n");
  process.stdout.write(`${token}`);
  process.stderr.write("\n");
}

function readKeyPairRSAfromPEM(): cryp.RSAKeypair {
  let pemstring: string;

  try {
    pemstring = fs.readFileSync(
      cli.CLIARGS.tenantApiAuthenticatorPrivkeyFilepath,
      "utf8"
    );
  } catch (err) {
    // This is an over-generalized error handler. Would have loved to
    // handle only SystemError (around file interaction) and decoding
    // errors, and re-raise every other error. How to do that cleanly?
    // Also see https://github.com/nodejs/node/issues/8342.
    // expected errors: ENOENT, EACCES, and related, also decoding errors.
    return die(
      `could not read private key file '${cli.CLIARGS.tenantApiAuthenticatorPrivkeyFilepath}': ${err.message}`
    );
  }

  // Expect PEM file structure:
  // -----BEGIN RSA PRIVATE KEY-----
  // MIIEpAIBAAKCAQEAwHtWIYduVZI2JK2wmDCisgSCIwAWCor1WZx/U3iXWwI9HaoG
  // ...
  // r7FksGLN0LhHuKM1EC4oSZGSBjIdm6GJ0oGNglprgZ/rY7VTcNU3HicMXTUuNaIu
  // 9f1rA3YxtkddPgZVebl/AFMnV5RK+1Yujy2VKlOPd2bcBtOFg4i8ww==
  // -----END RSA PRIVATE KEY-----

  let privkey: crypto.KeyObject;
  let pubkey: crypto.KeyObject;

  try {
    privkey = crypto.createPrivateKey({ key: pemstring, format: "pem" });
  } catch (err) {
    return die(`could not deserialize RSA private key: ${err.message}`);
  }

  try {
    pubkey = crypto.createPublicKey({ key: pemstring, format: "pem" });
  } catch (err) {
    return die(`could not deserialize RSA public key: ${err.message}`);
  }

  log.info("deserialized private key of type: %s", privkey.asymmetricKeyType);

  const pubkeyPem = pubkey.export({
    type: "spki",
    format: "pem"
  }) as string;

  return {
    privkeyObj: privkey,
    pubkeyPem: pubkeyPem
  };
}
