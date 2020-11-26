import React from "react";

import MuiListItem, { ListItemProps } from "@material-ui/core/ListItem";

export const ButtonListItem = (
  props: ListItemProps<"div", { button?: true }>
) => <MuiListItem dense {...props} button />;

const ListItem = (props: ListItemProps<"li", { button?: false }>) => (
  <MuiListItem dense {...props} />
);

export default ListItem;
