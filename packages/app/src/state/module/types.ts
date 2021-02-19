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
import * as yup from "yup";
import { SubscribeToModulesSubscription } from "state/clients/graphqlClient";
import { branchNameRegex } from "state/branch/types";

export type Module = SubscribeToModulesSubscription["module"][0];
export type Modules = SubscribeToModulesSubscription["module"];

// use this same id to unsubscribe
export type SubscriptionID = number;

export const moduleNameRegex = /^[A-Za-z0-9-_]+$/;
export const moduleScopeRegex = /^[A-Za-z0-9-_]*$/;

export const createModuleRequestSchema = yup.object({
  branch: yup.string().required().matches(branchNameRegex),
  name: yup.string().required().matches(moduleNameRegex),
  scope: yup.string().matches(moduleScopeRegex).default("")
});

export type CreateModuleRequestPayload = yup.InferType<
  typeof createModuleRequestSchema
>;
