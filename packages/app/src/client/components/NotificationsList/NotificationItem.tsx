import React from "react";
import Alert from "@material-ui/lab/Alert";
import AlertTitle from "@material-ui/lab/AlertTitle";
import NotificationsActions, { ActionsProps } from "./NotificationsActions";

export type NotificationState =
  | "error"
  | "warning"
  | "info"
  | "success";

export type NotificationItemProps = {
  children: React.ReactNode;
  title?: string;
  state?: NotificationState;
  handleClose?: () => void;
  actions?: ActionsProps[];
};
const NotificationItem = ({ handleClose, children, title, state, actions }: NotificationItemProps) => {
  return (
    <Alert
      severity={state || "info"}
      onClose={handleClose}
    >
      {title ? <AlertTitle>{title}</AlertTitle> : null}
      {children}
      {actions ? <NotificationsActions actions={actions}/> : null}
    </Alert>
  );
};

export default NotificationItem;
