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

/*
 Joins path segments.  Preserves initial "/" and resolves ".." and "."
 Does not support using ".." to go above/outside the root.
 This means that join("foo", "../../bar") will not resolve to "../bar"
 */
export function join(...paths: string[]) {
  // Split the inputs into a list of path commands.
  var parts: string[] = [];
  for (var i = 0, l = paths.length; i < l; i++) {
    parts = parts.concat(paths[i].split("/"));
  }
  // Interpret the path commands to get the new resolved path.
  var newParts = [];
  for (i = 0, l = parts.length; i < l; i++) {
    var part = parts[i];
    // Remove leading and trailing slashes
    // Also remove "." segments
    if (!part || part === ".") continue;
    // Interpret ".." to pop the last segment
    if (part === "..") newParts.pop();
    // Push new path segments.
    else newParts.push(part);
  }
  // Preserve the initial slash if there was one.
  if (parts[0] === "") newParts.unshift("");
  // Turn back into a single string path.
  return newParts.join("/") || (newParts.length ? "/" : ".");
}

/*
 A simple function to get the dirname of a path
 Trailing slashes are ignored. Leading slash is preserved.
*/
export function dirname(path: string) {
  return join(path, "..");
}
