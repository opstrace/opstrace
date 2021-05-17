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

/**
 * A list of resources which is `undefined` is the equivalent of an empty list. 
 * To keep the code simple we therefor use `[]` as default parameters.
*/
export const isResourceListEqual = <Resource>(
  desiredList: Array<Resource> = [],
  existingList: Array<Resource> = [],
  isResourceEqual: (desired: Resource, existing: Resource) => boolean
): boolean => {
  if (desiredList.length !== existingList.length) {
    return false;
  }

  return desiredList.every((desired, i) =>
    isResourceEqual(desired, existingList[i])
  );
};
