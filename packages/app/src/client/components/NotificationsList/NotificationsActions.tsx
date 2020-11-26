import React from "react";
import { Box } from "../Box";
import { Button } from "../Button";
import { CardActions } from "../Card";

export type ActionsProps = {
  name: string;
  handler: () => void;
};

export type NotificationsActionsProps = {
  actions: ActionsProps[];
};

const NotificationsActions = ({ actions }: NotificationsActionsProps) => {
  return (
    <Box ml={-1}>
      <CardActions>
        {
          actions.map((item) => (
            <Button
              variant="outlined"
              onClick={item.handler}
              key={item.name}
            >
              {item.name}
            </Button>
          ))
        }
      </CardActions>
    </Box>
  );
};

export default NotificationsActions;
