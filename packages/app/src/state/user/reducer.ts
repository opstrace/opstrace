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
import { Users } from "./types";
import * as actions from "./actions";

type UserActions = ActionType<typeof actions>;

type UserState = {
  currentUserId: string;
  currentUserIdLoaded: boolean;
  loading: boolean;
  users: Users;
};

const UserInitialState: UserState = {
  currentUserId: "",
  loading: true,
  currentUserIdLoaded: false,
  users: []
};

export const reducer = createReducer<UserState, UserActions>(UserInitialState)
  .handleAction(
    actions.setCurrentUser,
    (state, action): UserState => ({
      ...state,
      currentUserId: action.payload,
      currentUserIdLoaded: true
    })
  )
  .handleAction(
    actions.setDarkMode,
    (state, action): UserState => {
      // Make the changes optimistically
      const currentUser = state.users.find(
        u => u.email !== state.currentUserId
      );
      if (!currentUser) {
        return state;
      }
      const users = state.users
        .filter(u => u.opaque_id !== state.currentUserId)
        .concat({
          ...currentUser,
          preference: {
            ...currentUser.preference,
            dark_mode: action.payload
          }
        });

      return {
        ...state,
        users
      };
    }
  )
  .handleAction(
    actions.setUserList,
    (state, action): UserState => ({
      ...state,
      users: action.payload,
      loading: false
    })
  );
