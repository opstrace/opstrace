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

import React, { useState } from "react";

import Services from "../index";
import { useNotificationService } from "./NotificationService";
import { Button } from "../../components/Button";
import { NotificationState } from "./types";

export default {
  title: "Services/Notification"
};

function IWantToUseANotificationService() {
  const randomType = (): NotificationState => {
    const typeNum = Math.round(Math.random() * 3);
    switch (typeNum) {
      case 0:
        return "error";
      case 1:
        return "warning";
      case 2:
        return "success";
      default:
        return "info";
    }
  };

  const createNotification = () => {
    const newNotification = {
      id: `id-${notificationsCount}`,
      state: randomType(),
      title: `Notification #${notificationsCount}`,
      information: "Some test text",
      handleClose: () =>
        unregisterNotification({
          id: `id-${notificationsCount}`,
          title: "",
          information: ""
        }),
      actions:
        notificationsCount % 3 === 0
          ? [
              {
                name: "My action",
                handler: () => alert("executed action")
              }
            ]
          : undefined
    };
    registerNotification(newNotification);
    setNotificationsCount(notificationsCount + 1);
  };

  const [notificationsCount, setNotificationsCount] = useState(0);
  const {
    registerNotification,
    unregisterNotification
  } = useNotificationService();

  return (
    <>
      <Button variant="contained" state="primary" onClick={createNotification}>
        Add random notification
      </Button>
      <br />
      <br />
      Use ⌘+e (mac) or ⌃+e (linux/windows) to hide/show notifications
      <br />
      <br />
      Or use CommandPicker for it (⌘+⇧+p / ⌃+⇧+p)
    </>
  );
}

export const Default = (): JSX.Element => {
  return (
    <Services>
      <IWantToUseANotificationService />
    </Services>
  );
};
