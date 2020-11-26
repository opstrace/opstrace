import React from "react";
import styled from "styled-components";

import MuiCardActionArea, {
  CardActionAreaProps
} from "@material-ui/core/CardActionArea";

const BaseCardActionArea = (props: CardActionAreaProps) => (
  <MuiCardActionArea {...props} />
);

const CardActionArea = styled(BaseCardActionArea)``;

export default CardActionArea;
