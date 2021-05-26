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

export const tenantSchema = yup.object({
  // Provided by the user
  name: yup
    .string()
    .required("Must provide a name")
    .matches(
      /^[A-Za-z0-9-]+$/,
      "must only contain alphanumeric characters and -"
    ),

  // Provided by the user
  type: yup.mixed<"USER" | "SYSTEM">().oneOf(["SYSTEM", "USER"]).default("USER"),

  // Generated when the tenant is written to GraphQL, and then synced back to here.
  id: yup
    .string()
    .optional()
});

export type Tenant = yup.InferType<typeof tenantSchema>;
export type Tenants = Tenant[];
