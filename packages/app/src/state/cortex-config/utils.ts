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
import yaml from "js-yaml";
import { cortexLimitsSchema, RuntimeConfig, Config } from "./types";

/**
 * Parses runtime config yaml into an Object. Will throw an Error if runtime config yaml is invalid
 * @param config runtime config yaml
 * @returns RuntimeConfig object
 */
export async function validateAndExtractRuntimeConfig(
  config: string
): Promise<RuntimeConfig> {
  let runtimeConfig = yaml.load(config);

  if (!("overrides" in runtimeConfig)) {
    runtimeConfig = { ...runtimeConfig, overrides: {} };
  }

  for (const limits of Object.values(runtimeConfig.overrides)) {
    await cortexLimitsSchema.validate(limits);
  }

  return runtimeConfig;
}

/**
 * Parses cortex config yaml into an Object. Will throw an Error if config yaml is invalid.
 * If config yaml is invalid, it implies that our schema is wrong.
 * @param config cortex config yaml
 * @returns Config object
 */
export async function validateCortexConfig(config: string): Promise<Config> {
  const data = yaml.load(config);
  await cortexLimitsSchema.validate(data.limits);

  return data;
}
