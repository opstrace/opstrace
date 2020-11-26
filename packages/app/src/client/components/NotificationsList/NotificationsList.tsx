import React, { useEffect } from "react";
import Snackbar from '@material-ui/core/Snackbar';
import { makeStyles } from '@material-ui/core/styles';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import NotificationItem, { NotificationState } from "./NotificationItem";
import NotificationsListHeader from "./NotificationsListHeader";
import { Box } from "../Box";
import { ActionsProps } from "./NotificationsActions";
import { Scrollable } from "../Scrollable";


export type NotificationsListProps = {
  isOpen?: boolean;
  onDeleteAll?: () => void;
  onClose?: () => void;
  items: {
    id: string,
    title: string;
    information: string;
    state?: NotificationState;
    handleClose?: () => void;
    actions?: ActionsProps[];
  }[];
};

const useStyles = makeStyles((theme) => ({
  item: {
    padding: 0,
    display: 'block'
  }
}));

const NotificationsList = ({ isOpen, items, onClose, onDeleteAll }: NotificationsListProps) => {
  const classes = useStyles();

  const listNode = React.useRef<any>();
  const [height, setHeight] = React.useState<number>(0);

  useEffect(() => {
    setHeight(listNode.current?.clientHeight + 45);
  }, [items]);

  return (
    <Snackbar
      open={isOpen}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      disableWindowBlurListener={true}
    >
      <Box
        height={height}
        width={400}
        maxHeight={500}
      >
        <NotificationsListHeader
          counter={items.length}
          onDeleteAll={onDeleteAll}
          onClose={onClose}
        />

        <Scrollable>
          <List
            ref={listNode}
            disablePadding={true}
          >
            {
              items.map((data) => (
                <ListItem
                  key={data.id}
                  classes={{ root: classes.item }}
                >
                  <NotificationItem
                    {...data}
                  >
                    {data.information}
                  </NotificationItem>
                </ListItem>
              ))
            }
          </List>
        </Scrollable>
      </Box>
    </Snackbar>
  );
};

export default NotificationsList;
