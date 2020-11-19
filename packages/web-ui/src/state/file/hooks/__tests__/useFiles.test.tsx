import React from "react";
import { CombinedState } from "redux";
import { useDispatch, useSelector } from "react-redux";

import { renderHook } from "@testing-library/react-hooks";
import { StoreProvider } from "state/provider";
import getSubscriptionID from "state/utils/getSubscriptionID";
import { mainReducer } from "state/reducer";

import {
  useBranchFiles,
  useBranchTypescriptFiles,
  useLatestBranchTypescriptFiles,
  getCurrentBranchFiles
} from "../useFiles";
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

test("useBranchFiles hook", () => {
  const files = [{
    id: "test",
    branch_name: "test-branch",
    path: "foo/bar/baz",
  }];
  const dispatchMock = jest.fn();

  (useSelector as jest.Mock).mockReturnValueOnce(files);
  (useDispatch as jest.Mock).mockReturnValueOnce(dispatchMock);
  (getSubscriptionID as jest.Mock).mockReturnValueOnce(10);

  const { result } = renderHook(() => useBranchFiles(), {
    wrapper: ({ children }: any) => <StoreProvider>{children}</StoreProvider>
  });

  expect(useSelector).toHaveBeenCalledWith(getCurrentBranchFiles);
  expect(dispatchMock).toHaveBeenCalledWith(subscribe(10));
  expect(result.current).toEqual(files);
});

test("getCurrentBranchFiles selector", () => {
  const subState = {
    branches: { branches: [{ name: "test-branch" }], currentBranchName: "test-branch" }, files: {
      files: [{
        id: "test",
        branch_name: "test-branch",
        path: "foo/bar/baz",
      }]
    }
  };
  const state = mainReducer(subState as CombinedState<any>, mockAction);
  expect(getCurrentBranchFiles(state)).toEqual([{
    id: "test",
    branch_name: "test-branch",
    path: "foo/bar/baz",
  }]);
});

test("useBranchTypescriptFiles hook", () => {
  const subState = [{
    id: "test-1",
    branch_name: "test-branch-1",
    path: "foo/bar/baz",
    ext: ".ts"
  }, {
    id: "test-2",
    branch_name: "test-branch-2",
    path: "foo/bar/baz",
    ext: ".js"
  }];

  const dispatchMock = jest.fn();

  (useSelector as jest.Mock).mockReturnValueOnce(subState);
  (useDispatch as jest.Mock).mockReturnValueOnce(dispatchMock);

  const { result } = renderHook(() => useBranchTypescriptFiles(), {
    wrapper: ({ children }: any) => <StoreProvider>{children}</StoreProvider>
  });

  expect(result.current).toEqual([{
    id: "test-1",
    branch_name: "test-branch-1",
    path: "foo/bar/baz",
    ext: ".ts"
  }]);
});

test("useLatestBranchTypescriptFiles hook", () => {
  const subState = [{
    id: "test-1",
    branch_name: "test-branch-1",
    path: "foo/bar/baz",
    ext: ".ts",
  }, {
    id: "test-2",
    branch_name: "test-branch-2",
    path: "foo/bar/baz",
    ext: ".js",
  }];

  const dispatchMock = jest.fn();

  (useSelector as jest.Mock).mockReturnValueOnce(subState);
  (useDispatch as jest.Mock).mockReturnValueOnce(dispatchMock);

  const { result } = renderHook(() => useLatestBranchTypescriptFiles(), {
    wrapper: ({ children }: any) => <StoreProvider>{children}</StoreProvider>
  });

  expect(result.current).toEqual({
    files: [{
      id: "test-1",
      branch_name: "test-branch-1",
      path: "foo/bar/baz",
      ext: ".ts",
    }], tsFileCount: 1
  });
});