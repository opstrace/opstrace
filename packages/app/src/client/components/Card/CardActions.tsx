import React from "react";
import styled from "styled-components";

import MuiCardActions, {
  CardActionsProps
} from "@material-ui/core/CardActions";

const BaseCardActions = (props: CardActionsProps) => (
  <MuiCardActions {...props} />
);

const CardActions = styled(BaseCardActions)``;

export default CardActions;
