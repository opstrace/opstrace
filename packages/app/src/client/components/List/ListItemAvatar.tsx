import React from "react";
import styled from "styled-components";

import MuiListItemAvatar, {
  ListItemAvatarProps
} from "@material-ui/core/ListItemAvatar";

const BaseListItemAvatar = (props: ListItemAvatarProps) => (
  <MuiListItemAvatar {...props} />
);

const ListItemAvatar = styled(BaseListItemAvatar)``;

export default ListItemAvatar;
