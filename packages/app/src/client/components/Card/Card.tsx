import React from "react";
import styled, { css } from "styled-components";

import MuiCard, { CardProps as MuiCardProps } from "@material-ui/core/Card";

import { ITheme } from "client/themes/types";

type CardProps = MuiCardProps & {
  // optional padding
  p?: number;
};

const BaseCard = (props: CardProps) => <MuiCard {...props} />;

function spacing(theme: ITheme, value: number) {
  if (theme && typeof theme.spacing === "function") {
    return theme.spacing(value);
  }
  return 0;
}

const Card = styled(BaseCard)`
  ${props =>
    props.p
      ? css`
          padding: ${spacing(props.theme, props.p)}px;
        `
      : ""}
`;

export default Card;
