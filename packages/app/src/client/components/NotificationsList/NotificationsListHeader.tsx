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
import CloseIcon from "@material-ui/icons/Close";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import IconButton from "@material-ui/core/IconButton";
import { Box } from "../Box";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles(theme => ({
  box: {
    borderTopLeftRadius: theme.shape.borderRadius,
    borderTopRightRadius: theme.shape.borderRadius
  }
}));

export type NotificationsListHeaderProps = {
  counter: number;
  onDeleteAll?: () => void;
  onClose?: () => void;
};

const NotificationsListHeader = ({
  onClose,
  onDeleteAll,
  counter
}: NotificationsListHeaderProps) => {
  const classes = useStyles();
  return (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      bgcolor="grey.600"
      color="white"
      p={1}
      className={classes.box}
    >
      {counter ? `Notifications (${counter})` : "No notifications"}
      <Box>
        <IconButton title="Hide notifications" size="small" onClick={onClose}>
          <ExpandMoreIcon style={{ color: "white" }} fontSize="small" />
        </IconButton>

        <IconButton
          disabled={!counter}
          title="Clear all notifications"
          size="small"
          style={{ color: "white" }}
          onClick={onDeleteAll}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
};

export default NotificationsListHeader;
