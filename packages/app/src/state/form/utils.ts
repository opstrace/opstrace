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

import { split } from "ramda";

import getSubscriptionID from "state/utils/getSubscriptionID";

import { Form } from "./types";

const SEPERATOR = "/";

export const generateFormId = (type: string, code?: string) =>
  `${type}${SEPERATOR}${code || getSubscriptionID()}`;

export const makeFormId = (form: Form) => `${form.type}/${form.code}`;

export const expandFormId = (id: string): { type: string; code: string } => {
  const [type, code] = split(SEPERATOR)(id);
  return { type, code };
};

export const newForm = (type: string, code: string) => ({
  type,
  code,
  status: "active",
  data: {}
});
