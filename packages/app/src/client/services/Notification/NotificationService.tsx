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

import React, { useContext, useEffect } from "react";

import type {
  NotificationServiceApi,
  NotificationServiceState,
  Notification
} from "./types";
import { actions, notificationServiceReducer, initialState } from "./reducer";
import { useTypesafeReducer } from "../../hooks/useTypesafeReducer";
import NotificationsList from "../../components/NotificationsList/NotificationsList";

const notificationServiceContext = React.createContext<NotificationServiceApi | null>(
  null
);

function NotificationService({ children }: { children: React.ReactNode }) {
  const [
    state,
    { register, unregister, unregisterAll, changeVisibility }
  ] = useTypesafeReducer<NotificationServiceState, typeof actions>(
    notificationServiceReducer,
    initialState,
    actions
  );

  const notificationService: NotificationServiceApi = {
    register,
    unregister,
    unregisterAll,
    changeVisibility
  };

  // Enable this when we have notifications to show
  // useCommandService({
  //   id: "toggle-notification-visibility",
  //   description: "Toggle notifications visibility",
  //   keybindings: ["mod+e"],
  //   category: "View",
  //   handler: e => {
  //     e.keyboardEvent?.preventDefault();
  //     changeVisibility();
  //   }
  // });

  return (
    <>
      <notificationServiceContext.Provider value={notificationService}>
        {children}
      </notificationServiceContext.Provider>
      <NotificationsList
        isOpen={state.visibility}
        items={state.notifications}
        onDeleteAll={notificationService.unregisterAll}
        onClose={changeVisibility}
      />
    </>
  );
}

export function useNotificationService(
  notification?: Notification,
  dependencies?: []
) {
  const notificationService = useContext(notificationServiceContext);
  if (!notificationService) {
    throw new Error(
      "useNotificationService must be used within a NotificationService."
    );
  }

  useEffect(() => {
    if (notification) {
      notificationService.register(notification);
    }
    return () => {
      if (notification) notificationService.unregister(notification);
    };
    // eslint-disable-next-line
  }, [notification, notificationService, ...(dependencies || [])]);

  return {
    registerNotification: notificationService.register,
    unregisterNotification: notificationService.unregister,
    unregisterAllNotifications: notificationService.unregisterAll,
    changeNotificationVisibility: notificationService.changeVisibility
  };
}

export default React.memo(NotificationService);
