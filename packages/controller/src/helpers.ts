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

import { State } from "./reducer";
import { ControllerConfigType } from "@opstrace/controller-config";
import { Tenant } from "@opstrace/tenants";

export const DEVELOPMENT = "development";
/**
 * Generates a random 75 char long string of alphanumeric characters
 */
export function generateSecretValue(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}
/**
 * currentVersion returns the version of this controller.
 * If running with --development, currentVersion will return "development"
 */
export const currentVersion = (): string =>
  process.env.STACK_VERSION || DEVELOPMENT;

/**
 * iAmDesiredVersion will return true if the version passed in is equal to the version of this controller instance.
 * If running in development, currentVersion will return DEVELOPMENT
 */
export const iAmDesiredVersion = (version: string | undefined): boolean => {
  if (currentVersion() === DEVELOPMENT) {
    return true;
  }
  return version === currentVersion();
};

export const getControllerConfig = (state: State): ControllerConfigType => {
  if (state.config.config === undefined) {
    throw Error("Controller configmap is not present or missing fields");
  }
  return state.config.config;
};

export const getTenantNamespace = (tenant: Tenant): string =>
  `${tenant.name}-tenant`;

/**
 * Get the queue endpoint.
 */
export const getQueueEndpoint = (): string =>
  "kafka-kafka-bootstrap.kafka.svc.cluster.local:9092";

/**
 * getDomain returns the root domain for this stack
 * @param state
 */
export const getDomain = (state: State): string => {
  const stack = getControllerConfig(state);

  return `${stack.name}.${stack.dnsName.replace(/\.$/, "")}`;
};

export const getTenantDomain = (tenant: Tenant, state: State): string =>
  `${tenant.name}.${getDomain(state)}`;

export const getApiDomain = (
  api: string,
  tenant: Tenant,
  state: State
): string => `${api}.${getTenantDomain(tenant, state)}`;

export const getNodeCount = (state: State): number =>
  state.kubernetes.cluster.Nodes.resources.length;

export const getPrometheusName = (tenant: Tenant): string =>
  `${tenant.name}-prometheus`;

export const getAlertmanagerName = (tenant: Tenant): string =>
  `${tenant.name}-alertmanager`;
