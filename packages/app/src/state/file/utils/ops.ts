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

import { TextOperations } from "../types";

export function applyOps(content: string, ops: TextOperations) {
  let updatedContent = content;

  for (const [offset, change] of ops) {
    const start = offset;

    if (typeof change === "string") {
      // Insert operation
      updatedContent =
        updatedContent.slice(0, start) + change + updatedContent.slice(start);
    } else {
      // Delete operation
      updatedContent =
        updatedContent.slice(0, start) + updatedContent.slice(offset + change);
    }
  }

  return updatedContent;
}
