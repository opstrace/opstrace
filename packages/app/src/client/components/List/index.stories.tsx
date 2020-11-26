import React from "react";
import List, { VirtualListRenderItemProps } from "./List";
import { ButtonListItem } from "./ListItem";
import ListItemSecondaryAction from "./ListItemSecondaryAction";
import ListItemText from "./ListItemText";
import { Box } from "../Box";

export default {
  title: "Components/List"
};

export const Default = (): JSX.Element => {
  const renderItem = ({ index }: VirtualListRenderItemProps) => {
    return (
      <ButtonListItem>
        <ListItemText id={`${index}`} primary={`item ${index + 1}`} />
        <ListItemSecondaryAction>
          secondary action {index}
        </ListItemSecondaryAction>
      </ButtonListItem>
    );
  };

  return (
    <Box display="flex" width="100vw" height="100vh" p={1}>
      <List
        renderItem={renderItem}
        items={new Array(100000).fill(true)}
        itemSize={() => 30}
      />
    </Box>
  );
};
