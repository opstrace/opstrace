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
import { useDispatch, useSelector, State } from "state/provider";
import { subscribeToUserList, unsubscribeFromUserList } from "../actions";
import getSubscriptionID from "state/utils/getSubscriptionID";

type GetUserListOptions = {
  includeInactive: boolean;
};

export const getUserList = (
  state: State,
  options: GetUserListOptions | null = null
) => {
  return options?.includeInactive ? state.users.users : state.users.activeUsers;
};

/**
 * Subscribes to users and will update on
 * any changes. Automatically unsubscribeFromUserLists
 * on unmount.
 */
export default function useUserList() {
  const users = useSelector(getUserList);
  const dispatch = useDispatch();

  useEffect(() => {
    const subId = getSubscriptionID();
    dispatch(subscribeToUserList(subId));

    return () => {
      dispatch(unsubscribeFromUserList(subId));
    };
  }, [dispatch]);

  return users;
}
