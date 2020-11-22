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
  currentUser: {
    username: "Test",
    avatar: null,
    email: "email@email.com",
    preference: {
      dark_mode: true
    }
  },
  loading: false,
  currentUserLoaded: false
};

test("return mock state", () => {
  const reducer = UserReducer(mockState, {} as any);

  expect(reducer).toEqual(mockState);
});

test("handle setCurrentUser action", () => {
  const user = {
    username: "My User",
    avatar: null,
    email: "test@test.com",
    preference: {
      dark_mode: false
    }
  };

  const reducer = UserReducer(mockState, actions.setCurrentUser(user));

  expect(reducer.currentUser).toEqual(user);
});

test("handle setDarkMode action", () => {
  const reducer = UserReducer(mockState, actions.setDarkMode(false));

  expect(reducer.currentUser?.preference?.dark_mode).toBeFalsy();
});
