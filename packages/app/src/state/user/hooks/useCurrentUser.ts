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
import { useEffect } from "react";
import { createSelector } from "reselect";
import { useDispatch, useSelector, State } from "state/provider";
import { subscribeToUserList, unsubscribeFromUserList } from "../actions";
import getSubscriptionID from "state/utils/getSubscriptionID";

export const getCurrentUserId = (state: State) => state.users.currentUserId;

// Important: state.users.currentUserId is set via the login process, so if it's not set then the user is not
// logged in. "getCurrentUser" will initially be undefined after the user first logs in because state.users.allUsers
// data has yet to be loaded, so that shouldn't be used to determine if the user is logged in or not.
const getIsUserLoggedIn = createSelector(
  getCurrentUserId,
  currentUserId => !!currentUserId
);

export const useIsUserLoggedIn = () => useSelector(getIsUserLoggedIn);

export const getUsers = (state: State) => state.users.users;

export const getCurrentUserIdLoaded = (state: State) =>
  state.users.currentUserIdLoaded;

export const getUsersLoading = (state: State) => state.users.loading;

export const getCurrentUser = createSelector(
  getUsers,
  getCurrentUserId,
  (users, currentUserId) => users[currentUserId]
);

export const getCurrentUserLoaded = createSelector(
  getCurrentUserIdLoaded,
  getUsersLoading,
  (currentUserLoaded, usersLoading) => currentUserLoaded && !usersLoading
);

export function useCurrentUserLoaded() {
  return useSelector(getCurrentUserLoaded);
}

/**
 * Subscribes to users and will update on
 * any changes. Automatically unsubscribeFromUserLists
 * on unmount.
 */
export default function useCurrentUser() {
  const loggedIn = useIsUserLoggedIn();
  const currentUser = useSelector(getCurrentUser);
  const dispatch = useDispatch();

  useEffect(() => {
    // if the user is not logged in don't try to setup a sub as it will initially fail because the user is not logged in
    if (!loggedIn) return;

    const subId = getSubscriptionID();
    dispatch(subscribeToUserList(subId));
    return () => {
      dispatch(unsubscribeFromUserList(subId));
    };
  }, [dispatch, loggedIn]);

  return currentUser;
}
