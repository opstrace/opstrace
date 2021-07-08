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

import { Cookie, TestType } from "@playwright/test";

import { performLogin, log } from "../utils";

// First, check for _required_ env vars (keep this simple, to comply with README)
if (
  process.env.OPSTRACE_CLOUD_PROVIDER !== "aws" &&
  process.env.OPSTRACE_CLOUD_PROVIDER !== "gcp"
) {
  log.error(
    "env variable OPSTRACE_CLOUD_PROVIDER must be set to `aws` or `gcp`"
  );
  process.exit(1);
}
export const CLOUD_PROVIDER: string = process.env.OPSTRACE_CLOUD_PROVIDER;

if (!process.env.OPSTRACE_CLUSTER_NAME) {
  log.error("env variable OPSTRACE_CLUSTER_NAME must be set");
  process.exit(1);
}
export const CLUSTER_NAME: string = process.env.OPSTRACE_CLUSTER_NAME;

// Now, deal with optional env var. There is a default DNS name pointing to
// this Opstrace instance. Use that if OPSTRACE_INSTANCE_DNS_NAME is not set
// via env
let OPSTRACE_INSTANCE_DNS_NAME: string;
OPSTRACE_INSTANCE_DNS_NAME = `${CLUSTER_NAME}.opstrace.io`;
if (process.env.OPSTRACE_INSTANCE_DNS_NAME) {
  log.debug(
    "env variable OPSTRACE_INSTANCE_DNS_NAME is set: %s",
    process.env.OPSTRACE_INSTANCE_DNS_NAME
  );
  OPSTRACE_INSTANCE_DNS_NAME = process.env.OPSTRACE_INSTANCE_DNS_NAME;
} else {
  log.debug("env variable OPSTRACE_INSTANCE_DNS_NAME not set");
}

// CLUSTER_BASE_URL is fully specified by OPSTRACE_INSTANCE_DNS_NAME -- that's
// by definition of that very DNS name. That is, the base URL does not need to
// be injected via env.
export const CLUSTER_BASE_URL = `https://${OPSTRACE_INSTANCE_DNS_NAME}`;
export const CI_LOGIN_EMAIL = "ci-test@opstrace.com";
export const CI_LOGIN_PASSWORD = "This-is-not-a-secret!";

type SystemFixture = {
  runningInCI: boolean;
};

const CLOUD_PROVIDER_DEFAULTS = { aws: false, gcp: false };

type ClusterFixture = {
  name: string;
  baseUrl: string;
  cloudProvider: Record<string, boolean>;
};

type UserFixture = {
  email: string;
};

type AuthenticationFixture = {
  system: SystemFixture;
  cluster: ClusterFixture;
  user: UserFixture;
  authCookies: Cookie[];
};

export const addAuthFixture = (test: TestType) =>
  test.extend<Record<string, never>, AuthenticationFixture>({
    system: [
      async ({ browser }, use) => {
        const system: SystemFixture = {
          runningInCI: process.env.BUILDKITE === "true"
        };
        await use(system);
      },
      { scope: "worker" }
    ],
    cluster: [
      async ({ browser }, use) => {
        const cluster: ClusterFixture = {
          name: CLUSTER_NAME,
          baseUrl: CLUSTER_BASE_URL,
          cloudProvider: CLOUD_PROVIDER_DEFAULTS
        };
        cluster.cloudProvider[CLOUD_PROVIDER] = true;
        await use(cluster);
      },
      { scope: "worker" }
    ],
    user: [
      async ({ browser }, use) => {
        const user: UserFixture = {
          email: CI_LOGIN_EMAIL
        };
        await use(user);
      },
      { scope: "worker" }
    ],
    authCookies: [
      async ({ browser }, use) => {
        const context = await browser.newContext({ ignoreHTTPSErrors: true });
        const page = await context.newPage();

        await performLogin(page, CI_LOGIN_EMAIL, CI_LOGIN_PASSWORD);

        const cookies = await page.context().cookies();
        await page.close();

        await use(cookies);
      },
      { scope: "worker", auto: true }
    ]
  });
