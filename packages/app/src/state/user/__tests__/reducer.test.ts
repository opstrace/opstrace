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
import { reducer as UserReducer } from "../reducer";
import * as actions from "../actions";

const mockState = {
  currentUserId: "",
  loading: true,
  currentUserIdLoaded: false,
  allUsers: {},
  users: {}
};

test("return mock state", () => {
  const reducer = UserReducer(mockState, {} as any);

  expect(reducer).toEqual(mockState);
});

test("handle setCurrentUser action", () => {
  const reducer = UserReducer(mockState, actions.setCurrentUser("test-id"));

  expect(reducer.currentUserId).toEqual("test-id");
  expect(reducer.currentUserIdLoaded).toBeTruthy();
});

test("handle setDarkMode action", () => {
  const user1 = {
    email: "test1@test.com",
    username: "test1",
    role: "",
    id: "test1",
    created_at: "20202-11-11",
    preference: { dark_mode: false },
    active: false
  };
  const testState = {
    currentUserId: "test1",
    loading: false,
    currentUserIdLoaded: true,
    users: { test1: user1 },
    allUsers: { test1: user1 }
  };
  const reducer = UserReducer(testState, actions.setDarkMode(true));
  expect(reducer.users.test1.preference?.dark_mode).toBeTruthy();
});

test("handle setUserList action", () => {
  const user1 = {
    email: "test1@test.com",
    username: "test1",
    role: "",
    id: "test1",
    created_at: "20202-11-11",
    preference: { dark_mode: false },
    active: true
  };
  const user2 = {
    email: "test2@test.com",
    username: "test2",
    role: "",
    id: "test2",
    created_at: "20202-11-12",
    active: false
  };

  const reducer = UserReducer(mockState, actions.setUserList([user1, user2]));

  expect(reducer.allUsers).toEqual({ test1: user1, test2: user2 });
  expect(reducer.users).toEqual({ test1: user1 });
});
