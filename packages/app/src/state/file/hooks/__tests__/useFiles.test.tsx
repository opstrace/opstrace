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
  getCurrentBranchFiles,
  getOpenFileParams,
  getCurrentlySelectedFile,
  useBranchTypescriptFilesForModuleVersion,
  getBranchTypescriptFiles
} from "../useFiles";
import { subscribe } from "../../actions";

jest.mock("react-redux", () => ({
  ...(jest.requireActual("react-redux") as object),
  useDispatch: jest.fn(),
  useSelector: jest.fn()
}));

jest.mock("state/utils/getSubscriptionID");

afterEach(() => {
  jest.clearAllMocks();
});

const mockAction = { type: "UNKNOWN_ACTION" } as any;

test("useBranchFiles hook", () => {
  const files = [
    {
      id: "test",
      branch_name: "test-branch",
      path: "foo/bar/baz"
    }
  ];
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
    branches: {
      branches: [{ name: "test-branch" }],
      currentBranchName: "test-branch"
    },
    files: {
      files: [
        {
          id: "test",
          branch_name: "test-branch",
          path: "foo/bar/baz"
        }
      ]
    }
  };
  const state = mainReducer(subState as CombinedState<any>, mockAction);
  expect(getCurrentBranchFiles(state)).toEqual([
    {
      id: "test",
      branch_name: "test-branch",
      path: "foo/bar/baz"
    }
  ]);
});

test("useBranchTypescriptFiles hook", () => {
  const subState = [
    {
      id: "test-1",
      branch_name: "test-branch-1",
      path: "foo/bar/baz",
      ext: ".ts"
    },
    {
      id: "test-2",
      branch_name: "test-branch-2",
      path: "foo/bar/baz",
      ext: ".js"
    }
  ];

  const dispatchMock = jest.fn();

  (useSelector as jest.Mock).mockReturnValueOnce(subState);
  (useDispatch as jest.Mock).mockReturnValueOnce(dispatchMock);

  const { result } = renderHook(() => useBranchTypescriptFiles(), {
    wrapper: ({ children }: any) => <StoreProvider>{children}</StoreProvider>
  });

  expect(result.current).toEqual([
    {
      id: "test-1",
      branch_name: "test-branch-1",
      path: "foo/bar/baz",
      ext: ".ts"
    }
  ]);
});

test("useBranchTypescriptFilesForModuleVersion hook", () => {
  const subState = [
    {
      id: "test-1",
      branch_name: "test-branch-1",
      path: "foo/bar/baz",
      ext: ".ts",
      module_scope: "/foo",
      module_name: "test",
      module_version: "0.1"
    },
    {
      id: "test-2",
      branch_name: "test-branch-2",
      path: "foo/bar/baz",
      ext: ".ts",
      module_scope: "/",
      module_name: "test",
      module_version: "0.2"
    }
  ];

  const dispatchMock = jest.fn();
  (useSelector as jest.Mock).mockReturnValueOnce(subState);
  (useDispatch as jest.Mock).mockReturnValue(dispatchMock);

  const { result } = renderHook(
    () => useBranchTypescriptFilesForModuleVersion("test", "/foo", "0.1"),
    {
      wrapper: ({ children }: any) => <StoreProvider>{children}</StoreProvider>
    }
  );

  expect(result.current).toEqual([
    {
      file: {
        branch_name: "test-branch-1",
        ext: ".ts",
        id: "test-1",
        module_name: "test",
        module_scope: "/foo",
        module_version: "0.1",
        path: "foo/bar/baz"
      },
      isNewFile: false,
      isNewModule: true,
      rebaseRequired: false
    }
  ]);
});

test("useLatestBranchTypescriptFiles hook", () => {
  const subState = [
    {
      id: "test-1",
      branch_name: "test-branch-1",
      path: "foo/bar/baz",
      ext: ".ts"
    },
    {
      id: "test-2",
      branch_name: "test-branch-2",
      path: "foo/bar/baz",
      ext: ".js"
    }
  ];

  const dispatchMock = jest.fn();

  (useSelector as jest.Mock).mockReturnValueOnce(subState);
  (useDispatch as jest.Mock).mockReturnValueOnce(dispatchMock);

  const { result } = renderHook(() => useLatestBranchTypescriptFiles(), {
    wrapper: ({ children }: any) => <StoreProvider>{children}</StoreProvider>
  });

  expect(result.current).toEqual({
    files: [
      {
        id: "test-1",
        branch_name: "test-branch-1",
        path: "foo/bar/baz",
        ext: ".ts"
      }
    ],
    tsFileCount: 1
  });
});

describe("getBranchTypescriptFiles selector", () => {
  test("should find typescript files", () => {
    const subState = {
      branches: {
        branches: [{ name: "test-branch" }],
        currentBranchName: "test-branch"
      },
      files: {
        files: [
          {
            id: "ts-file",
            ext: "ts",
            branch_name: "test-branch"
          },
          {
            id: "tsx-file",
            ext: "tsx",
            branch_name: "test-branch"
          },
          {
            id: "js-file",
            ext: "js",
            branch_name: "test-branch"
          }
        ]
      }
    };

    const state = mainReducer(subState as CombinedState<any>, mockAction);
    expect(getBranchTypescriptFiles(state)).toEqual([
      {
        id: "ts-file",
        ext: "ts",
        branch_name: "test-branch"
      },
      {
        id: "tsx-file",
        ext: "tsx",
        branch_name: "test-branch"
      }
    ]);
  });

  test("should not find typescript files if its absent in store", () => {
    const subState = {
      branches: {
        branches: [{ name: "test-branch" }],
        currentBranchName: "test-branch"
      },
      files: {
        files: [
          {
            id: "js-file",
            ext: "js",
            branch_name: "test-branch"
          }
        ]
      }
    };

    const state = mainReducer(subState as CombinedState<any>, mockAction);
    expect(getBranchTypescriptFiles(state)).toEqual([]);
  });
});

describe("getCurrentlySelectedFile selector", () => {
  test("should find current selected file", () => {
    const subState = {
      files: {
        selectedFileId: "file-1",
        openFiles: [
          {
            file: {
              id: "file-1",
              ext: "txt",
              module_name: "test-module"
            }
          },
          {
            file: {
              id: "file-2",
              ext: "js",
              module_name: "test-module"
            }
          }
        ]
      }
    };

    const state = mainReducer(subState as CombinedState<any>, mockAction);
    expect(getCurrentlySelectedFile(state)).toEqual({
      file: {
        id: "file-1",
        ext: "txt",
        module_name: "test-module"
      }
    });
  });

  test("should not find current selected file if its absent in store", () => {
    const subState = {
      files: {
        selectedFileId: "no-file",
        openFiles: []
      }
    };

    const state = mainReducer(subState as CombinedState<any>, mockAction);
    expect(getCurrentlySelectedFile(state)).toBeNull();
  });
});

test("getOpenFileParams selector", () => {
  const subState = {
    files: {
      files: [],
      selectedModuleName: "module-test",
      selectedModuleScope: "/foo"
    }
  };

  const state = mainReducer(subState as CombinedState<any>, mockAction);
  const result = getOpenFileParams(state);

  expect(result.requestedModuleName).toEqual("module-test");
  expect(result.requestedModuleScope).toEqual("/foo");
  expect(result.requestedModuleVersion).toBeUndefined();
  expect(result.requestedFilePath).toBeUndefined();
});
