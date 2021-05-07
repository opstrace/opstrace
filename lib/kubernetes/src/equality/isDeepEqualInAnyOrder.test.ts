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

import isDeepEqualInAnyOrder from "./isDeepEqualInAnyOrder";

describe("isDeepEqualInAnyOrder()", () => {
  it("identifies array containing the same items as equal", () => {
    const object1 = {
      A: [{ id: 1 }, { id: 2 }]
    };

    const object2 = {
      A: [{ id: 2 }, { id: 1 }]
    };

    expect(isDeepEqualInAnyOrder(object1, object2)).toBe(true);
  });

  it("identifies arrays inside objects inside arrays containing the same items as equal", () => {
    const object1 = {
      A: [
        {
          foo: [{ id: 1 }, { id: 2 }]
        },
        {
          baz: [{ id: 3 }, { id: 4 }]
        }
      ]
    };

    const object2 = {
      A: [
        {
          baz: [{ id: 4 }, { id: 3 }]
        },
        {
          foo: [{ id: 2 }, { id: 1 }]
        }
      ]
    };

    expect(isDeepEqualInAnyOrder(object1, object2)).toBe(true);
  });

  it("identifies array containing different items as unequal", () => {
    const object1 = {
      A: [{ id: 1 }, { id: 2 }]
    };

    const object2 = {
      A: [{ id: 2 }, { id: 3 }]
    };

    expect(isDeepEqualInAnyOrder(object1, object2)).toBe(false);
  });

  it("identifies arrays inside objects inside arrays containing differen items as unequal", () => {
    const object1 = {
      A: [
        {
          foo: [{ id: 1 }, { id: 2 }]
        },
        {
          baz: [{ id: 2 }, { id: 1 }]
        }
      ]
    };

    const object2 = {
      A: [
        {
          baz: [{ id: 1 }, { id: 2 }]
        },
        {
          foo: [{ id: 2 }, { id: 1 }]
        }
      ]
    };

    expect(isDeepEqualInAnyOrder(object1, object2)).toBe(true);
  });
});
