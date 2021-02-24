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

import * as Diff from "diff";
import { log } from "./log";
/**
 * Deep diff between two objects
 */
export function diff(
  old: any, // eslint-disable-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
  possiblyChangedObj: any // eslint-disable-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) {
  return Diff.diffJson(old, possiblyChangedObj);
}

export function logDiff(
  old: any, // eslint-disable-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
  possiblyChangedObj: any // eslint-disable-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) {
  let msg = "";
  diff(old, possiblyChangedObj).forEach(change => {
    if (change.added) {
      msg += `\x1b[32m${change.value}\x1b[0m`;
    } else if (change.removed) {
      msg += `\x1b[31m${change.value}\x1b[0m`;
    } else {
      msg += `\x1b[2m${change.value}\x1b[0m`;
    }
  });
  if (msg.length) {
    log.debug(msg);
  }
}
