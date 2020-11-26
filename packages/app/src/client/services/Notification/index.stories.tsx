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
      handleClose: () => unregisterNotification({
        id: `id-${notificationsCount}`,
        title: "",
        information: ""
      }),
      actions: notificationsCount % 3 === 0 ? [{
        name: "My action",
        handler: () => alert("executed action")
      }] : undefined
    };
    registerNotification(newNotification);
    setNotificationsCount(notificationsCount + 1)
  };

  const [notificationsCount, setNotificationsCount] = useState(0);
  const { registerNotification, unregisterNotification } = useNotificationService();

  return (
    <>
      <Button
        variant="contained"
        state="primary"
        onClick={createNotification}
      >
        Add random notification
      </Button>
      <br/>
      <br/>
      Use ⌘+e (mac) or ⌃+e (linux/windows) to hide/show notifications
      <br/>
      <br/>
      Or use CommandPicker for it (⌘+⇧+p / ⌃+⇧+p)
    </>
  )
}

export const Default = (): JSX.Element => {
  return (
    <Services>
      <IWantToUseANotificationService/>
    </Services>
  );
};