import React from "react";
import styled from "styled-components";

import MuiCardContent, {
  CardContentProps
} from "@material-ui/core/CardContent";

const BaseCardContent = (props: CardContentProps) => (
  <MuiCardContent {...props} />
);

const CardContent = styled(BaseCardContent)``;

export default CardContent;
