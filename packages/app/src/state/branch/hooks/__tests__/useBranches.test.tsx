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

import useBranches, {
  getBranches,
  getCurrentBranch,
  getCurrentBranchName,
  useCurrentBranch
} from "../useBranches";
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

test("useBranches hook", () => {
  const branches = [{ branch: "test-id" }];
  const dispatchMock = jest.fn();

  (useSelector as jest.Mock).mockReturnValueOnce(branches);
  (useDispatch as jest.Mock).mockReturnValueOnce(dispatchMock);
  (getSubscriptionID as jest.Mock).mockReturnValueOnce(10);

  const { result } = renderHook(() => useBranches(), {
    wrapper: ({ children }: any) => <StoreProvider>{children}</StoreProvider>
  });

  expect(useSelector).toHaveBeenCalledWith(getBranches);
  expect(dispatchMock).toHaveBeenCalledWith(subscribe(10));
  expect(result.current).toEqual(branches);
});

test("getBranches selector", () => {
  const subState = { branches: { branches: [{ name: "Test" }] } };
  const state = mainReducer(subState as CombinedState<any>, mockAction);
  expect(getBranches(state)).toEqual([{ name: "Test" }]);
});

test("useCurrentBranch hook", () => {
  const branch = { name: "main" };

  const dispatchMock = jest.fn();

  (useSelector as jest.Mock).mockReturnValueOnce(branch);
  (useDispatch as jest.Mock).mockReturnValueOnce(dispatchMock);
  (getSubscriptionID as jest.Mock).mockReturnValueOnce(10);

  const { result } = renderHook(() => useCurrentBranch(), {
    wrapper: ({ children }: any) => <StoreProvider>{children}</StoreProvider>
  });

  expect(useSelector).toHaveBeenCalledWith(getCurrentBranch);
  expect(dispatchMock).toHaveBeenCalledWith(subscribe(10));
  expect(result.current).toEqual(branch);
});

test("getBranches selector", () => {
  const subState = { branches: { branches: [{ name: "Test" }] } };
  const state = mainReducer(subState as CombinedState<any>, mockAction);
  expect(getBranches(state)).toEqual([{ name: "Test" }]);
});

test("getCurrentBranchName selector", () => {
  const subState = {
    branches: {
      branches: [{ name: "Test", id: "test-id" }],
      currentBranchName: "Test"
    }
  };
  const state = mainReducer(subState as CombinedState<any>, mockAction);
  expect(getCurrentBranchName(state)).toEqual("Test");
});

describe("getCurrentBranch selector", () => {
  test("should find current branch", () => {
    const subState = {
      branches: {
        branches: [{ name: "Test", id: "test-id" }],
        currentBranchName: "Test"
      }
    };
    const state = mainReducer(subState as CombinedState<any>, mockAction);
    expect(getCurrentBranch(state)).toEqual({ name: "Test", id: "test-id" });
  });

  test("should not find current branch if its absent in store", () => {
    const subState = {
      branches: {
        branches: [{ name: "Test", id: "test-id" }],
        currentBranchName: "Undefined Branch Name"
      }
    };
    const state = mainReducer(subState as CombinedState<any>, mockAction);
    expect(getCurrentBranch(state)).toBeNull();
  });

  test("return undefined if loading is true", () => {
    const subState = {
      branches: {
        branches: [{ name: "Test", id: "test-id" }],
        currentBranchName: "Undefined Branch Name",
        loading: true
      }
    };
    const state = mainReducer(subState as CombinedState<any>, mockAction);
    expect(getCurrentBranch(state)).toBeUndefined();
  });
});
