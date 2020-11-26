import { getPlatformMetaKey, replaceModKeyWithPlatformMetaKey, getModifierSymbol } from "../util";

const navigatorGetter = jest.spyOn(global, "navigator", "get");

afterAll(() => {
  navigatorGetter.mockRestore();
});

describe("handle platformMetaKey", () => {
  test("return correct value when platform is iPod", () => {
    navigatorGetter.mockReturnValue({
      ...global.navigator,
      platform: "iPod",
    });
    expect(getPlatformMetaKey()).toEqual("cmd");
  });

  test("return correct value when platform is unknown", () => {
    const navigatorGetter = jest.spyOn(global, "navigator", "get");
    navigatorGetter.mockReturnValue({
      ...global.navigator,
      platform: "unknown",
    });
    expect(getPlatformMetaKey()).toEqual("ctrl");
  });
});

describe("handle replaceModKeyWithPlatformMetaKey", () => {
  test("return correct value when platform is iPhone", () => {
    navigatorGetter.mockReturnValue({
      ...global.navigator,
      platform: "iPhone",
    });
    expect(replaceModKeyWithPlatformMetaKey("mod+shift+z")).toEqual("cmd+shift+z");
  });

  test("return correct value when platform is unknown", () => {
    const navigatorGetter = jest.spyOn(global, "navigator", "get");
    navigatorGetter.mockReturnValue({
      ...global.navigator,
      platform: "test",
    });
    expect(replaceModKeyWithPlatformMetaKey("shift+mod+q")).toEqual("shift+ctrl+q");
  });
});

test("get correct modifier symbols", () => {
  expect(getModifierSymbol("shift")).toEqual("⇧");
  expect(getModifierSymbol("control")).toEqual("⌃");
  expect(getModifierSymbol("enter")).toEqual("enter");
});