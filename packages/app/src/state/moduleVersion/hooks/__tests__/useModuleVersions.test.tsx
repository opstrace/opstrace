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
  useSortedVersionsForModule,
  makeSortedVersionsForModuleSelector,
  useLatestMainVersionForModule
} from "../useModuleVersions";
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

test("useSortedVersionsForModule hook", () => {
  const versions = [
    {
      module_version: "0.1",
      version: "1",
      branch_name: "test",
      module_name: "test-module"
    }
  ];

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

describe("makeSortedVersionsForModuleSelector selector", () => {
  test("should find versions", () => {
    const subState = {
      branches: {
        branches: [{ name: "test-branch", scope: "/" }],
        currentBranchName: "test-branch"
      },
      moduleVersions: {
        versions: [
          {
            branch_name: "test-branch",
            module_name: "test-1",
            module_scope: "/",
            version: "1"
          },
          {
            branch_name: "test-branch",
            module_name: "test-2",
            module_scope: "/",
            version: "2"
          }
        ]
      }
    };
    const state = mainReducer(subState as CombinedState<any>, mockAction);
    expect(makeSortedVersionsForModuleSelector("test-1", "/")(state)).toEqual([
      {
        branch_name: "test-branch",
        module_name: "test-1",
        module_scope: "/",
        version: "1"
      }
    ]);
  });

  test("should not find versions if its absent in store", () => {
    const subState = {
      branches: {
        branches: [{ name: "test-branch", scope: "/" }],
        currentBranchName: "test-branch"
      },
      moduleVersions: {
        versions: [
          {
            branch_name: "test-branch-1",
            module_name: "test-1",
            module_scope: "/",
            version: "1"
          },
          {
            branch_name: "test-branch-2",
            module_name: "test-1",
            module_scope: "/",
            version: "2"
          }
        ]
      }
    };
    const state = mainReducer(subState as CombinedState<any>, mockAction);
    expect(makeSortedVersionsForModuleSelector("test-1", "/")(state)).toEqual(
      []
    );
  });
});

test("useLatestMainVersionForModule hook", () => {
  const versions = [
    {
      version: "10",
      branch_name: "main",
      module_name: "test-module-1"
    },
    {
      version: "5",
      branch_name: "branch-1",
      module_name: "test-module-2"
    }
  ];

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
    module_name: "test-module-1"
  });
});
