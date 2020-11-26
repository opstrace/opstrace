import { renderHook } from "@testing-library/react-hooks";
import useQueryParams, { getParametersFromSearchString } from "../useQueryParams";

jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');
  return {
    ...originalModule,
    useHistory: () => ({
      location: {
        search: "?test=123"
      }
    })
  };
});

test("getParametersFromSearchString function returns correct values", () => {
  const emptyResult = getParametersFromSearchString("");
  expect(emptyResult).toEqual({});

  const result = getParametersFromSearchString("?foo=1&bar=26&baz=qwerty");
  expect(result).toEqual({ foo: "1", bar: "26", baz: "qwerty" });
});

test("useQueryParams hook returns correct result", () => {
  const { result } = renderHook(() => useQueryParams());

  expect(result.current).toEqual({ test: "123" });
});