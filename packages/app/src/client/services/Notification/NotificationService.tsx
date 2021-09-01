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
import { actions } from "./reducer";
import NotificationsList from "../../components/NotificationsList/NotificationsList";
import { random } from "lodash";
import { useDispatch, useSelector } from "react-redux";
import { State } from "state/reducer";

const notificationServiceContext =
  React.createContext<NotificationServiceApi | null>(null);

function NotificationService({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();
  const { notifications, visibility } = useSelector<State, NotificationServiceState>(state => state.notifications);

  const notificationService: NotificationServiceApi = {
    register: (...args) => dispatch(actions.register(...args)),
    unregister: (...args) => dispatch(actions.unregister(...args)),
    unregisterAll: (...args) => dispatch(actions.unregisterAll(...args)),
    changeVisibility: (...args) => dispatch(actions.changeVisibility(...args))
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
        isOpen={visibility}
        items={notifications}
        onDeleteAll={notificationService.unregisterAll}
        onClose={notificationService.changeVisibility}
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

export function useSimpleNotification() {
  const { registerNotification, unregisterNotification } =
    useNotificationService();

  return {
    registerNotification: ({
      title,
      information,
      state
    }: Pick<Notification, "title" | "information" | "state">) => {
      const messageId = random(0, 9999).toString();
      const newNotification = {
        id: messageId,
        state,
        title,
        information,
        handleClose: () =>
          unregisterNotification({
            id: messageId,
            title: "",
            information: ""
          })
      };
      registerNotification(newNotification);
    }
  };
}

export default React.memo(NotificationService);
