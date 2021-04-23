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

import * as cli from "./index";
// import * as util from "./util";
import * as cryp from "./crypto";

export async function create(): Promise<void> {
  const keypair: cryp.RSAKeypair = cryp.readRSAKeyPairfromPEMfile(
    // Expect a PEM file encoding private key within `BEGIN RSA PRIVATE KEY ...
    // END RSA PRIVATE KEY` Note that this actually encodes the complete key
    // pair.
    // TODO: check file permissions, that this is 600-protected
    cli.CLIARGS.tenantApiAuthenticatorKeyFilePath
  );

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
