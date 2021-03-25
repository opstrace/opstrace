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

import fs from "fs";

import yaml from "js-yaml";

import {
  LatestClusterConfigFileSchemaType,
  LatestClusterConfigFileSchema,
  LatestAWSInfraConfigSchema,
  LatestGCPInfraConfigSchema
} from "./schemas";

import {
  LatestAWSInfraConfigType,
  LatestGCPInfraConfigType
} from "@opstrace/config";

import { log, die } from "@opstrace/utils";

/**
 * Read user-given cluster config (UCC) document from either file or stdin.
 * Validate it, interpolate with defaults, and return it. Or error out.
 */
export async function uccGetAndValidate(
  clusterConfigFilePath: string,
  cloudProvider: "aws" | "gcp"
): Promise<
  [
    LatestClusterConfigFileSchemaType,
    LatestAWSInfraConfigType | undefined,
    LatestGCPInfraConfigType | undefined
  ]
> {
  let uccDoc: string;

  // Empty string is defined as "not provided, read from stdin"
  if (clusterConfigFilePath === "") {
    uccDoc = await uccFromStdin();
  } else {
    uccDoc = uccFromFile(clusterConfigFilePath);
  }

  log.debug("user-given cluster config doc:\n%s", uccDoc);

  let ucc;
  try {
    ucc = yaml.safeLoad(uccDoc);
  } catch (err) {
    die(`could not YAML-decode cluster config: ${err.message}`);
  }

  log.debug(
    "user-given cluster config parsed. JSON representation:\n%s",
    JSON.stringify(ucc, null, 2)
  );

  // "Strict schemas skip coercion and transformation attempts, validating the value "as is"."
  // This is mainly to error out upon unexpected parameters: to 'enforce' yup's
  // noUnknown, see
  // https://github.com/jquense/yup/issues/829#issuecomment-606030995
  // https://github.com/jquense/yup/issues/697
  try {
    LatestClusterConfigFileSchema.validateSync(ucc, { strict: true });
  } catch (err) {
    die(`invalid cluster config document: ${err.message}`);
  }

  // validate again, this time "only" to interpolate with defaults, see
  // https://github.com/jquense/yup/pull/961
  const uccWithDefaults: LatestClusterConfigFileSchemaType = LatestClusterConfigFileSchema.validateSync(
    ucc
  );

  // now process provider-specific part of config

  let infraConfigAWS: LatestAWSInfraConfigType | undefined;
  let infraConfigGCP: LatestGCPInfraConfigType | undefined;

  if (cloudProvider === "aws") {
    if (uccWithDefaults.aws !== undefined) {
      log.debug("ucc.aws: %s", JSON.stringify(uccWithDefaults.aws, null, 2));
    } else {
      uccWithDefaults.aws = {};
      log.info("infra config: `aws` not set: populate with defaults");
    }

    try {
      LatestAWSInfraConfigSchema.validateSync(uccWithDefaults.aws, {
        strict: true
      });
    } catch (err) {
      die(`cluster config error: invalid value for 'aws': ${err.message}`);
    }

    infraConfigAWS = LatestAWSInfraConfigSchema.validateSync(
      uccWithDefaults.aws
    );

    if (uccWithDefaults.gcp !== undefined) {
      log.info("Provider is AWS. `gcp` is set in config. Ignore.");
      delete uccWithDefaults.gcp;
    }

    // Forget user-given input, overwrite with validation/fill result.
    //uccWithDefaults.aws = infraConfigAWS;
  }

  if (cloudProvider === "gcp") {
    if (uccWithDefaults.gcp !== undefined) {
      log.debug("ucc.gcp: %s", JSON.stringify(uccWithDefaults.aws, null, 2));
    } else {
      uccWithDefaults.gcp = {};
      log.info("infra config: `gcp` not set: populate with defaults");
    }

    try {
      LatestGCPInfraConfigSchema.validateSync(uccWithDefaults.gcp, {
        strict: true
      });
    } catch (err) {
      die(`cluster config error: invalid value for 'gcp': ${err.message}`);
    }

    infraConfigGCP = LatestGCPInfraConfigSchema.validateSync(
      uccWithDefaults.gcp
    );

    if (uccWithDefaults.aws !== undefined) {
      log.info("Provider is GCP. `aws` is set in config. Ignore.");
      delete uccWithDefaults.aws;
    }

    // Forget user-given input, overwrite with validation/fill result.
    //uccWithDefaults.gcp = infraConfigGCP;
  }

  // provider-specific infra config has been extracted, remove all traces
  // from ucc
  delete uccWithDefaults.aws;
  delete uccWithDefaults.gcp;

  log.debug("user-given cluster config validated");
  return [uccWithDefaults, infraConfigAWS, infraConfigGCP];
}

function uccFromFile(clusterConfigFilePath: string) {
  try {
    return fs.readFileSync(clusterConfigFilePath, "utf8");
  } catch (err) {
    // This is an over-generalized error handler. Would have loved to
    // handle only SystemError (around file interaction) and decoding
    // errors, and re-raise every other error. How to do that cleanly?
    // Also see https://github.com/nodejs/node/issues/8342.
    // expected errors: ENOENT, EACCES, and related, also decoding errors.
    return die(
      `could not read file '${clusterConfigFilePath}': ${err.message}`
    );
  }
}

async function uccFromStdin() {
  log.info("waiting for cluster config on stdin ...");

  // TODO: catch utf-8-decoding errors and handle with a good error message.
  return await readTextFromStdinUntilEOF();
}

async function readTextFromStdinUntilEOF() {
  // fs.readFileSync(0, "utf8"); would block the event loop
  // in a way that it wouldn't call SIGINT handlers. And other than that
  // there's a bunch of not-so-well-designed npm packages, such as get-stdin
  // which tries to be too smart:
  // https://github.com/sindresorhus/get-stdin/issues/21
  // should be working in all relevant environments / on all relevant
  // platforms, but of course let's see; this is a very pragmatic approach.
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}
