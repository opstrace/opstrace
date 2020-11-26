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

import { createReducer, ActionType, createAction } from "typesafe-actions";
import { Notification, NotificationServiceState } from "./types";

export const actions = {
  register: createAction("REGISTER_NOTIFICATION")<Notification>(),
  unregister: createAction("UNREGISTER_NOTIFICATION")<Notification>(),
  unregisterAll: createAction("UNREGISTER_ALL")(),
  changeVisibility: createAction("CHANGE_VISIBILITY")()
};

type Actions = ActionType<typeof actions>;

function removeNotification(
  notifications: Notification[],
  notification: Notification
): Notification[] {
  return notifications.filter(n => n.id !== notification.id);
}

function findNotification(
  notifications: Notification[],
  notification: Notification
): Notification | undefined {
  return notifications.find(n => n.id === notification.id);
}

export const initialState: NotificationServiceState = {
  notifications: [],
  visibility: false
};

export const notificationServiceReducer = createReducer<
  NotificationServiceState,
  Actions
>(initialState)
  .handleAction(
    actions.register,
    (state, action): NotificationServiceState => {
      if (findNotification(state.notifications, action.payload)) {
        return state;
      }

      const notifications = [action.payload].concat(state.notifications);
      return {
        ...state,
        visibility: true,
        notifications
      };
    }
  )
  .handleAction(
    actions.unregister,
    (state, action): NotificationServiceState => {
      const notifications = removeNotification(
        state.notifications,
        action.payload
      );

      return {
        ...state,
        notifications
      };
    }
  )
  .handleAction(
    actions.unregisterAll,
    (state, _): NotificationServiceState => ({
      ...state,
      notifications: []
    })
  )
  .handleAction(
    actions.changeVisibility,
    (state, _): NotificationServiceState => ({
      ...state,
      visibility: !state.visibility
    })
  );
