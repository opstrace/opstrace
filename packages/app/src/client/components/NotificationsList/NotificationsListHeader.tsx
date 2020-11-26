import React from "react";
import CloseIcon from '@material-ui/icons/Close';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import IconButton from '@material-ui/core/IconButton';
import { Box } from "../Box";

export type NotificationsListHeaderProps = {
  counter: number;
  onDeleteAll?: () => void;
  onClose?: () => void;
};

const NotificationsListHeader = ({ onClose, onDeleteAll, counter }: NotificationsListHeaderProps) => {
  return (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      bgcolor="grey.600"
      p={1}
    >
      {
        counter ? `Notifications (${counter})` : "No notifications"
      }
      <Box>
        <IconButton
          title="Hide notifications"
          size="small"
          onClick={onClose}
        >
          <ExpandMoreIcon fontSize="small"/>
        </IconButton>

        <IconButton
          disabled={!counter}
          title="Clear all notifications"
          size="small"
          onClick={onDeleteAll}
        >
          <CloseIcon fontSize="small"/>
        </IconButton>
      </Box>
    </Box>
  );
};

export default NotificationsListHeader;
