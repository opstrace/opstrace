/**
 * Copyright 2019-2021 Opstrace, Inc.
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

// export const getInfrastructureName = (
//   org: string,
//   clusterName: string
// ): string => {
//   // Note(JP): this appears to be an infrastructure component name prefix.
//   // We could make it a property of `stack` and call it `.infraNamePrefix`.
//   // `org` already is a property on `stack`, and `name` also is.
//   // Update(JP): slowly carving this out, also as part of "org removal".
//   // we might want to go back later and add a concept for an infrastructure
//   // prefix but as of now there is no clear need, and in terms of resource
//   // name length limitation that might actually reduce the amount of
//   // meaningful information we can encode in resource names (the Opstrace
//   // cluster name should be _guaranteed_ to be part of resource names).
//   return `${org}-${clusterName}`;
// };

export function getBucketName({
  clusterName,
  suffix
}: {
  clusterName: string;
  suffix: string;
}): string {
  return `${clusterName}-${suffix}`;
}
