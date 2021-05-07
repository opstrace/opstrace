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

import { isEqualWith, intersectionWith } from "lodash";

const doArraysContainSameItems = <T>(
  arrOne: Array<T>,
  arrTwo: Array<T>
): boolean => {
  if (arrOne.length !== arrOne.length) {
    return false;
  }

  /* If the intersection is every element from arrOne, and every element 
     from arrTwo, then arrOne and arrTwo are the same */
  const intersection = intersectionWith(arrOne, arrTwo, isDeepEqualInAnyOrder);

  return intersection.length === arrOne.length;
};

const isDeepEqualInAnyOrder = <T>(existing: T, desired: T): boolean => {
  return isEqualWith(existing, desired, (a, b) => {
    /* Is the items to compare are arrays, we compare them ourselves, if not,
       we let lodash handle it */
    if (Array.isArray(a) && Array.isArray(b)) {
      return doArraysContainSameItems(a, b);
    }

    // returning `undefined` defaults to normal deep comparing of values
    return undefined;
  });
};

export default isDeepEqualInAnyOrder;
