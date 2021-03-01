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
import { UserRecords } from "./types";
import * as actions from "./actions";
import { pluck, zipObj, pickBy, mergeDeepLeft } from "ramda";
import { isActive } from "state/user/utils";

type UserActions = ActionType<typeof actions>;

type UserState = {
  currentUserId: string;
  currentUserIdLoaded: boolean;
  loading: boolean;
  allUsers: UserRecords;
  users: UserRecords;
};

const UserInitialState: UserState = {
  currentUserId: "",
  loading: true,
  currentUserIdLoaded: false,
  allUsers: {},
  users: {}
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
      if (!state.currentUserIdLoaded) return state;

      return mergeDeepLeft(state, {
        users: {
          [state.currentUserId]: { preferences: { dark_mode: action.payload } }
        },
        allUsers: {
          [state.currentUserId]: { preferences: { dark_mode: action.payload } }
        }
      });
    }
  )
  .handleAction(
    actions.setUserList,
    (state, action): UserState => {
      const users: UserRecords = zipObj(pluck("id")(action.payload))(
        action.payload
      );

      return {
        ...state,
        allUsers: users,
        users: pickBy<UserRecords>(isActive)(users),
        loading: false
      };
    }
  );
