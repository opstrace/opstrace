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

import winston from "winston";

const logFormat = winston.format.printf(
  ({ level, message, label, timestamp }) => {
    return `${timestamp} ${level}: ${message}`;
  }
);

export const log = winston.createLogger({
  levels: winston.config.syslog.levels,
  level: "info",
  format: winston.format.combine(
    winston.format.splat(),
    winston.format.timestamp(),
    winston.format.colorize(),
    logFormat
  ),
  transports: [new winston.transports.Console()]
});

export let CLUSTER_BASE_URL: string;
export let CLOUD_PROVIDER: string;

export const CI_LOGIN_EMAIL = "ci-test@opstrace.com";
export const CI_LOGIN_PASSWORD = "This-is-not-a-secret!";

let globalTestSuiteSetupPerformed = false;
export function globalTestSuiteSetupOnce() {
  log.info("globalTestSuiteSetupOnce()");

  if (globalTestSuiteSetupPerformed) {
    return;
  }
  globalTestSuiteSetupPerformed = true;

  const clusterName: string = process.env.OPSTRACE_CLUSTER_NAME || "";
  if (!clusterName) {
    log.error("env variable OPSTRACE_CLUSTER_NAME must be set");
    process.exit(1);
  }

  CLOUD_PROVIDER = process.env.OPSTRACE_CLOUD_PROVIDER || "";
  if (!CLOUD_PROVIDER) {
    log.error(
      "env variable OPSTRACE_CLOUD_PROVIDER must be set to `aws` or `gcp`"
    );
    process.exit(1);
  }

  CLUSTER_BASE_URL = `https://${clusterName}.opstrace.io`;
  log.info("CLUSTER_BASE_URL: %s", CLUSTER_BASE_URL);
}
