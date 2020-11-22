import React from "react";
import { CombinedState } from "redux";
import { useDispatch, useSelector } from "react-redux";

import { renderHook } from "@testing-library/react-hooks";
import { StoreProvider } from "state/provider";
import getSubscriptionID from "state/utils/getSubscriptionID";
import { mainReducer } from "state/reducer";

import {
  useSortedVersionsForModule,
  makeVersionsForModuleSelector,
  useLatestMainVersionForModule
} from "../useModuleVersions";
import { subscribe } from "../../actions";

jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux") as object,
  useDispatch: jest.fn(),
  useSelector: jest.fn()
}));

jest.mock("state/utils/getSubscriptionID");

afterEach(() => {
  jest.clearAllMocks();
});

const mockAction = { type: "UNKNOWN_ACTION" } as any;

test("useSortedVersionsForModule hook", () => {
  const versions = [{
    module_version: "0.1",
    version: "1",
    branch_name: "test",
    module_name: "test-module",
  }];

  const dispatchMock = jest.fn();

  (useSelector as jest.Mock).mockReturnValueOnce(versions);
  (useDispatch as jest.Mock).mockReturnValueOnce(dispatchMock);
  (getSubscriptionID as jest.Mock).mockReturnValueOnce(10);

  const { result } = renderHook(() => useSortedVersionsForModule("", ""), {
    wrapper: ({ children }: any) => <StoreProvider>{children}</StoreProvider>
  });

  expect(dispatchMock).toHaveBeenCalledWith(subscribe(10));
  expect(result.current).toEqual(versions);
});

describe("makeVersionsForModuleSelector selector", () => {
  test("should find versions", () => {
    const subState = {
      branches: { branches: [{ name: "test-branch", scope: "/" }], currentBranchName: "test-branch" },
      moduleVersions: {
        versions: [{
          branch_name: "test-branch",
          module_name: "test-1",
          module_scope: "/",
          version: "1",
        }, {
          branch_name: "test-branch",
          module_name: "test-2",
          module_scope: "/",
          version: "2",
        }]
      }
    };
    const state = mainReducer(subState as CombinedState<any>, mockAction);
    expect(makeVersionsForModuleSelector("test-1", "/")(state)).toEqual([{
      branch_name: "test-branch",
      module_name: "test-1",
      module_scope: "/",
      version: "1"
    }]);
  });


  test("should not find versions if its absent in store", () => {
    const subState = {
      branches: { branches: [{ name: "test-branch", scope: "/" }], currentBranchName: "test-branch" },
      moduleVersions: {
        versions: [{
          branch_name: "test-branch-1",
          module_name: "test-1",
          module_scope: "/",
          version: "1",
        }, {
          branch_name: "test-branch-2",
          module_name: "test-1",
          module_scope: "/",
          version: "2",
        }]
      }
    };
    const state = mainReducer(subState as CombinedState<any>, mockAction);
    expect(makeVersionsForModuleSelector("test-1", "/")(state)).toEqual([]);
  });
});


test("useLatestMainVersionForModule hook", () => {
  const versions = [{
    version: "10",
    branch_name: "main",
    module_name: "test-module-1",
  }, {
    version: "5",
    branch_name: "branch-1",
    module_name: "test-module-2",
  }];

  const dispatchMock = jest.fn();

  (useSelector as jest.Mock).mockReturnValueOnce(versions);
  (useDispatch as jest.Mock).mockReturnValueOnce(dispatchMock);
  (getSubscriptionID as jest.Mock).mockReturnValueOnce(10);

  const { result } = renderHook(() => useLatestMainVersionForModule("", ""), {
    wrapper: ({ children }: any) => <StoreProvider>{children}</StoreProvider>
  });

  expect(dispatchMock).toHaveBeenCalledWith(subscribe(10));
  expect(result.current).toEqual({
    version: "10",
    branch_name: "main",
    module_name: "test-module-1",
  });
});