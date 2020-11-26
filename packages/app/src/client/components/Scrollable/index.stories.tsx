import React from "react";

import List, { VirtualListRenderItemProps } from "../List/List";
import { ButtonListItem } from "../List/ListItem";
import ListItemText from "../List/ListItemText";

export default {
  title: "Components/Scrollable"
};

export const Default = (): JSX.Element => {
  const renderItem = ({ index }: VirtualListRenderItemProps) => {
    return (
      <ButtonListItem>
        <ListItemText id={`${index}`} primary={`item ${index + 1}`} />
      </ButtonListItem>
    );
  };

  return (
    <>
      <List
        renderItem={renderItem}
        items={new Array(100000).fill(true)}
        height={500}
        itemSize={() => 30}
      />
      <br />
      <br />
      This list has 100,000 items
    </>
  );
};
