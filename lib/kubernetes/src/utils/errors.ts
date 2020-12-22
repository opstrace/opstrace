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

import { IncomingMessage } from "http";

export type KubernetesError = {
  statusCode: number;
  message: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
export const kubernetesError = (e: any): KubernetesError => {
  let statusCode = -1;
  const message = JSON.stringify(e);
  const err = e.response as IncomingMessage;

  if (err && "statusCode" in err && err.statusCode) {
    statusCode = err.statusCode;
  }

  return { statusCode, message };
};
