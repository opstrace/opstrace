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
import * as R from "ramda";
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

      const newState = R.mergeDeepRight(state, {
        users: {
          [state.currentUserId]: { preference: { dark_mode: action.payload } }
        },
        allUsers: {
          [state.currentUserId]: { preference: { dark_mode: action.payload } }
        }
      });

      return newState;
    }
  )
  .handleAction(
    actions.setUserList,
    (state, action): UserState => {
      const userIds: string[] = R.pluck("id", action.payload);
      const deletedUserIds: string[] = R.pipe(
        R.keys,
        R.without(userIds)
      )(state.allUsers);

      const users: UserRecords = R.zipObj(userIds, action.payload);
      const allUsers: UserRecords = R.omit(
        deletedUserIds,
        R.mergeDeepLeft(users, state.allUsers)
      );

      return {
        ...R.pick(["currentUserId", "currentUserIdLoaded"], state),
        loading: false,
        allUsers: allUsers,
        users: R.pickBy<UserRecords>(isActive)(allUsers)
      };
    }
  );
