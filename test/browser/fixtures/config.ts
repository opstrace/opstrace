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

import { TestType } from "@playwright/test";

import { log } from "../utils";

const CLUSTER_NAME: string = process.env.OPSTRACE_CLUSTER_NAME || "unknown";

const CLUSTER_BASE_URL: string = !process.env.OPSTRACE_CLUSTER_BASE_URL
  ? `https://${CLUSTER_NAME}.opstrace.io`
  : process.env.OPSTRACE_CLUSTER_BASE_URL;

const CLOUD_PROVIDER: string = process.env.OPSTRACE_CLOUD_PROVIDER || "unknown";

type SystemFixture = {
  runningInCI: boolean;
  workerAuth: boolean;
};

const CLOUD_PROVIDER_DEFAULTS = { aws: false, gcp: false, unknown: false };

type ClusterFixture = {
  name: string;
  baseUrl: string;
  cloudProvider: Record<string, boolean>;
};

type UserFixture = {
  email: string;
  password: string;
};

type ConfigFixture = {
  system: SystemFixture;
  cluster: ClusterFixture;
  user: UserFixture;
};

export const addConfigFixture = (test: TestType) =>
  test.extend<Record<string, never>, ConfigFixture>({
    system: [
      async ({ browser }, use) => {
        const system: SystemFixture = {
          runningInCI: process.env.BUILDKITE === "true",
          workerAuth: process.env.OPSTRACE_AUTH_METHOD !== "test"
        };
        await use(system);
      },
      { scope: "worker" }
    ],
    cluster: [
      async ({ browser }, use) => {
        if (!CLUSTER_BASE_URL) {
          log.error(
            "env variables OPSTRACE_CLUSTER_NAME or OPSTRACE_CLUSTER_BASE_URL must be set"
          );
          process.exit(1);
        }

        if (!CLOUD_PROVIDER) {
          log.error(
            "env variable OPSTRACE_CLOUD_PROVIDER must be set to `aws` or `gcp`"
          );
          process.exit(1);
        }

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
          email: "ci-test@opstrace.com",
          password: "This-is-not-a-secret!"
        };
        await use(user);
      },
      { scope: "worker" }
    ]
  });
