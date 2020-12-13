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

import {
  getPlatformMetaKey,
  replaceModKeyWithPlatformMetaKey,
  getModifierSymbol,
  getKeysFromKeybinding
} from "../util";

const navigatorGetter = jest.spyOn(global, "navigator", "get");

afterAll(() => {
  navigatorGetter.mockRestore();
});

describe("handle platformMetaKey", () => {
  test("return correct value when platform is iPod", () => {
    navigatorGetter.mockReturnValue({
      ...global.navigator,
      platform: "iPod"
    });
    expect(getPlatformMetaKey()).toEqual("cmd");
  });

  test("return correct value when platform is unknown", () => {
    const navigatorGetter = jest.spyOn(global, "navigator", "get");
    navigatorGetter.mockReturnValue({
      ...global.navigator,
      platform: "unknown"
    });
    expect(getPlatformMetaKey()).toEqual("ctrl");
  });
});

describe("handle replaceModKeyWithPlatformMetaKey", () => {
  test("return correct value when platform is iPhone", () => {
    navigatorGetter.mockReturnValue({
      ...global.navigator,
      platform: "iPhone"
    });
    expect(replaceModKeyWithPlatformMetaKey("mod+shift+z")).toEqual(
      "cmd+shift+z"
    );
  });

  test("return correct value when platform is unknown", () => {
    const navigatorGetter = jest.spyOn(global, "navigator", "get");
    navigatorGetter.mockReturnValue({
      ...global.navigator,
      platform: "test"
    });
    expect(replaceModKeyWithPlatformMetaKey("shift+mod+q")).toEqual(
      "shift+ctrl+q"
    );
  });
});

test("get correct modifier symbols", () => {
  expect(getModifierSymbol("shift")).toEqual("⇧");
  expect(getModifierSymbol("control")).toEqual("⌃");
  expect(getModifierSymbol("enter")).toEqual("enter");
});

describe("handle getKeysFromKeybinding", () => {
  test("return correct value when platform is iPad", () => {
    navigatorGetter.mockReturnValue({
      ...global.navigator,
      platform: "iPad"
    });
    expect(getKeysFromKeybinding("mod+shift+z")).toEqual(["⌘", "⇧", "z"]);
  });

  test("return correct value when platform is unknown", () => {
    const navigatorGetter = jest.spyOn(global, "navigator", "get");
    navigatorGetter.mockReturnValue({
      ...global.navigator,
      platform: "test"
    });
    expect(getKeysFromKeybinding("shift+mod+q")).toEqual(["⇧", "⌃", "q"]);
  });
});
