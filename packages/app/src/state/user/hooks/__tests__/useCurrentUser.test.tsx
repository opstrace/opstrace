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
import { useDispatch, useSelector } from "react-redux";

import { renderHook } from "@testing-library/react-hooks";
import { StoreProvider } from "state/provider";
import getSubscriptionID from "state/utils/getSubscriptionID";

import useCurrentUser, {
  getCurrentUser,
  getCurrentUserLoaded,
  getCurrentUserId,
  getUsers,
  getCurrentUserIdLoaded,
  getUsersLoading
} from "../useCurrentUser";
import { subscribeToUserList } from "../../actions";
import { mainReducer } from "state/reducer";
import { CombinedState } from "redux";

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

test("useCurrentUser hook", () => {
  const user = {
    currentUserId: "",
    loading: true,
    currentUserIdLoaded: false,
    users: []
  };

  const dispatchMock = jest.fn();

  (useSelector as jest.Mock).mockReturnValueOnce(user);
  (useDispatch as jest.Mock).mockReturnValueOnce(dispatchMock);
  (getSubscriptionID as jest.Mock).mockReturnValueOnce(1);

  const { result } = renderHook(() => useCurrentUser(), {
    wrapper: ({ children }: any) => <StoreProvider>{children}</StoreProvider>
  });

  expect(dispatchMock).toHaveBeenCalledWith(subscribeToUserList(1));
  expect(result.current).toEqual(user);
});

test("getCurrentUser selector", () => {
  const user1 = {
    email: "test1@test.com",
    username: "test1",
    role: "",
    opaque_id: "test1",
    created_at: "20202-11-11",
    preference: { dark_mode: false }
  };
  const user2 = {
    email: "test2@test.com",
    username: "test2",
    role: "",
    opaque_id: "test2",
    created_at: "20202-11-12"
  };
  const subState = {
    users: {
      currentUserId: "test2",
      loading: true,
      currentUserIdLoaded: false,
      users: [user1, user2]
    }
  };
  const state = mainReducer(subState as CombinedState<any>, mockAction);
  expect(getCurrentUser(state)).toEqual(user2);
});

test("getUsers selector", () => {
  const user1 = {
    email: "test1@test.com",
    username: "test1",
    role: "",
    opaque_id: "test1",
    created_at: "20202-11-11",
    preference: { dark_mode: false }
  };
  const user2 = {
    email: "test2@test.com",
    username: "test2",
    role: "",
    opaque_id: "test2",
    created_at: "20202-11-12"
  };
  const subState = {
    users: {
      currentUserId: "test2",
      loading: true,
      currentUserIdLoaded: false,
      users: [user1, user2]
    }
  };
  const state = mainReducer(subState as CombinedState<any>, mockAction);
  expect(getUsers(state)).toEqual([user1, user2]);
});

test("getCurrentUserIdLoaded selector", () => {
  const subState = {
    users: {
      currentUserId: "test2",
      loading: true,
      currentUserIdLoaded: false,
      users: [
        {
          email: "test2@test.com",
          username: "test2",
          role: "",
          opaque_id: "test2",
          created_at: "20202-11-12"
        }
      ]
    }
  };

  const state = mainReducer(subState as CombinedState<any>, mockAction);
  expect(getCurrentUserIdLoaded(state)).toBeFalsy();
});

test("getUsersLoading selector", () => {
  const subState = {
    users: {
      currentUserId: "test2",
      loading: true,
      currentUserIdLoaded: false,
      users: []
    }
  };

  const state = mainReducer(subState as CombinedState<any>, mockAction);
  expect(getUsersLoading(state)).toBeTruthy();
});

test("getCurrentUserLoaded selector", () => {
  const subState = {
    users: {
      currentUserId: "test2",
      loading: true,
      currentUserIdLoaded: false,
      users: []
    }
  };

  const state = mainReducer(subState as CombinedState<any>, mockAction);
  expect(getCurrentUserLoaded(state)).toBeFalsy();
});

test("getCurrentUserId selector", () => {
  const subState = {
    users: {
      currentUserId: "test2",
      loading: true,
      currentUserIdLoaded: false,
      users: []
    }
  };

  const state = mainReducer(subState as CombinedState<any>, mockAction);
  expect(getCurrentUserId(state)).toEqual("test2");
});
