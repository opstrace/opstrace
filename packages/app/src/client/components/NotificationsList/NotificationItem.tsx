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

import React from "react";
import Alert from "@material-ui/lab/Alert";
import AlertTitle from "@material-ui/lab/AlertTitle";
import NotificationsActions, { ActionsProps } from "./NotificationsActions";
import styled from "styled-components";

export type NotificationState = "error" | "warning" | "info" | "success";

const StyledAlert = styled(Alert)(props => ({
  borderRadius: 0,
  "&:last-child": {
    borderBottomLeftRadius: props.theme.shape.borderRadius,
    borderBottomRightRadius: props.theme.shape.borderRadius
  }
}));

export type NotificationItemProps = {
  children: React.ReactNode;
  title?: string;
  state: NotificationState;
  handleClose?: () => void;
  actions?: ActionsProps[];
};
const NotificationItem = ({
  handleClose,
  children,
  title,
  state,
  actions
}: NotificationItemProps) => {
  return (
    <StyledAlert severity={state} onClose={handleClose}>
      {title ? <AlertTitle>{title}</AlertTitle> : null}
      {children}
      {actions ? <NotificationsActions actions={actions} /> : null}
    </StyledAlert>
  );
};

NotificationItem.defaultProps = {
  state: "info"
};

export default NotificationItem;
