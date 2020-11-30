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

import { createReducer, ActionType } from "typesafe-actions";
import { CurrentUser, Users } from "./types";
import * as actions from "./actions";

type UserActions = ActionType<typeof actions>;

type UserState = {
  currentUser: CurrentUser;
  loading: boolean;
  currentUserLoaded: boolean;
  users: Users;
};

const CurrentUserInitialState: CurrentUser = {
  username: "",
  avatar: null,
  email: "",
  preference: {
    dark_mode: true
  }
};

const UserInitialState: UserState = {
  currentUser: CurrentUserInitialState,
  loading: true,
  currentUserLoaded: false,
  users: []
};

const currentUserReducer = createReducer<CurrentUser, UserActions>(
  CurrentUserInitialState
)
  .handleAction(
    actions.setCurrentUser,
    (state, action): CurrentUser => action.payload
  )
  .handleAction(
    actions.setDarkMode,
    (state, action): CurrentUser => {
      return {
        email: state?.email || "",
        username: state?.username || "",
        avatar: state?.avatar,
        preference: {
          dark_mode: action.payload
        }
      };
    }
  );

export const reducer = createReducer<UserState, UserActions>(UserInitialState)
  .handleAction(
    [actions.setDarkMode, actions.setCurrentUser], // pass all these actions through to currentUserReducer
    (state, action): UserState => ({
      ...state,
      currentUser: currentUserReducer(state.currentUser, action),
      loading: false,
      currentUserLoaded: true
    })
  )
  .handleAction(
    actions.setUserList,
    (state, action): UserState => ({
      ...state,
      users: action.payload
    })
  );
