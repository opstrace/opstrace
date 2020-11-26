import React from "react";
import styled from "styled-components";

import MuiCardMedia, { CardMediaProps } from "@material-ui/core/CardMedia";

const BaseCardMedia = (props: CardMediaProps) => <MuiCardMedia {...props} />;

const CardMedia = styled(BaseCardMedia)``;

export default CardMedia;
