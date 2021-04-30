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

// Module for managing the authenticator key set (AKS) in an existing
// Opstrace cluster.

import fs from "fs";
import crypto from "crypto";

import { KubeConfig } from "@kubernetes/client-node";
import { log, die, keyIDfromPEM } from "@opstrace/utils";

import * as controllerconfig from "@opstrace/controller-config";

import * as cli from "./index";
import * as cryp from "./crypto";
import * as util from "./util";

export async function createKeypair(): Promise<void> {
  const modulusLengthBits = 2048;

  log.info(
    "generate new RSA keypair. Modulus length (bits): %s",
    modulusLengthBits
  );

  const { privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: modulusLengthBits
  });

  // About PKCS1 vs PKCS8:
  // PKCS8 is a little more modern and supports not only RSA.
  // https://superuser.com/a/606266/178217
  // https://stackoverflow.com/a/48960291/145400
  // https://crypto.stackexchange.com/a/47433/43746
  const privkeyPem = privateKey.export({
    type: "pkcs8",
    format: "pem"
  }) as string;

  const fpath = cli.CLIARGS.tenantApiAuthenticatorKeyFilePath;

  log.info("write key pair to file (mode: 600): %s", fpath);

  try {
    fs.writeFileSync(fpath, privkeyPem, {
      mode: 0o600,
      encoding: "utf8"
    });
  } catch (err) {
    return die(`could not write file '${fpath}': ${err.message}`);
  }
}

/* Modify cluster state: add public key to authenticator config
 *
 * Specifically, mutate the corresponding Opstrace controller config paramters
 * in the Opstrace controller's k8s config map. Upon mutating the config map,
 * rely on the controller to observe the mutation and restart the corresponding
 * k8s deployments.
 */
export async function addKeyToAuthenticatorConfig(): Promise<void> {
  const pubkeypem = cryp.readRSAPubKeyfromPEMfileAsPEMstring(
    cli.CLIARGS.tenantApiAuthenticatorKeyFilePath
  );

  const kubeconfig = await util.getKubeConfigForOpstraceClusterOrDie(
    cli.CLIARGS.cloudProvider,
    cli.CLIARGS.clusterName
  );

  await mutateClusterStateAddAuthenticatorKey(kubeconfig, pubkeypem);
}

export async function listKeys(): Promise<void> {
  const kubeconfig = await util.getKubeConfigForOpstraceClusterOrDie(
    cli.CLIARGS.cloudProvider,
    cli.CLIARGS.clusterName
  );

  await listAuthenticatorKeys(kubeconfig);
}

export async function removeKey(): Promise<void> {
  if (cli.CLIARGS.keyId.length !== 40) {
    die("unexpected key ID: expecting a string with 40 characters");
  }

  const kubeconfig = await util.getKubeConfigForOpstraceClusterOrDie(
    cli.CLIARGS.cloudProvider,
    cli.CLIARGS.clusterName
  );

  await removeAuthenticatorKey(kubeconfig, cli.CLIARGS.keyId);
}

async function removeAuthenticatorKey(
  kubeconfig: KubeConfig,
  keyIdToRemove: string
) {
  const controllerConfigObj = await fetchControllerConfigWithCurrentKeySet(
    kubeconfig
  );

  const keySet = JSON.parse(
    controllerConfigObj.tenant_api_authenticator_pubkey_set_json
  );

  log.info(
    "number of public keys currently configured: %s",
    Object.keys(keySet).length
  );

  const newKeySetJSON: string = controllerconfig.authenticatorKeySetRemoveKey(
    controllerConfigObj.tenant_api_authenticator_pubkey_set_json,
    keyIdToRemove
  );

  await setControllerConfigWithNewKeySet(
    kubeconfig,
    newKeySetJSON,
    controllerConfigObj
  );
}

async function listAuthenticatorKeys(kubeconfig: KubeConfig) {
  const controllerConfigObj = await fetchControllerConfigWithCurrentKeySet(
    kubeconfig
  );

  const keySet = JSON.parse(
    controllerConfigObj.tenant_api_authenticator_pubkey_set_json
  );

  log.info("number of public keys configured: %s", Object.keys(keySet).length);

  for (const keyId in keySet) {
    process.stdout.write(`${keyId}\n`);
  }
}

async function mutateClusterStateAddAuthenticatorKey(
  kubeconfig: KubeConfig,
  newPubkeyPem: string
) {
  const keyIDnewPubkey = keyIDfromPEM(newPubkeyPem);
  const controllerConfigObj = await fetchControllerConfigWithCurrentKeySet(
    kubeconfig
  );

  log.info("add new public key with id %s key to config", keyIDnewPubkey);
  const newKeySetJSON: string = controllerconfig.authenticatorKeySetAddKey(
    controllerConfigObj.tenant_api_authenticator_pubkey_set_json,
    newPubkeyPem
  );

  await setControllerConfigWithNewKeySet(
    kubeconfig,
    newKeySetJSON,
    controllerConfigObj
  );
}

async function setControllerConfigWithNewKeySet(
  kubeconfig: KubeConfig,
  newKeySetJSON: string,
  controllerConfigObj: any
) {
  log.info(
    "new tenant_api_authenticator_pubkey_set_json, deserialized: %s",
    JSON.parse(newKeySetJSON)
  );

  controllerConfigObj.tenant_api_authenticator_pubkey_set_json = newKeySetJSON;

  log.info("set new controller config (k8s config map)");
  await controllerconfig.set(controllerConfigObj, kubeconfig);

  log.info("controller config map updated");
}

async function fetchControllerConfigWithCurrentKeySet(
  kubeconfig: KubeConfig
): Promise<controllerconfig.LatestControllerConfigType> {
  //@ts-ignore: this is a wtf moment
  const controllerConfigObj: controllerconfig.LatestControllerConfigType = await controllerconfig.fetch(
    kubeconfig
  );

  if (controllerConfigObj === undefined) {
    die("error: could not read current Opstrace controller config");
  }

  log.debug(
    "current controller config: %s",
    JSON.stringify(controllerConfigObj, null, 2)
  );

  if (
    controllerConfigObj.tenant_api_authenticator_pubkey_set_json === undefined
  ) {
    die(
      "error: parameter tenant_api_authenticator_pubkey_set_json is undefined in controller config"
    );
  }

  log.debug(
    "current tenant_api_authenticator_pubkey_set_json, deserialized: %s",
    JSON.parse(controllerConfigObj.tenant_api_authenticator_pubkey_set_json)
  );

  return controllerConfigObj;
}
