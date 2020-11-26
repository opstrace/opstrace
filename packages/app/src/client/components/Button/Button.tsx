import React from "react";
import styled, { css } from "styled-components";
import MuiButton, {
  ButtonProps as MuiButtonProps
} from "@material-ui/core/Button";

import { ITheme } from "client/themes";

type ButtonState =
  | "success"
  | "error"
  | "warning"
  | "primary"
  | "secondary"
  | "info";

export type ButtonProps = MuiButtonProps & {
  state?: ButtonState;
};

const BaseButton = ({ children, state, ...rest }: ButtonProps) => {
  return (
    <MuiButton size={rest.size || "small"} {...rest}>
      {children}
    </MuiButton>
  );
};

const getColorForState = (theme: ITheme, state?: ButtonState) => {
  switch (state) {
    case "primary":
      return theme.palette.primary;
    case "secondary":
      return theme.palette.secondary;
    case "error":
      return theme.palette.error;
    case "warning":
      return theme.palette.warning;
    case "success":
      return theme.palette.success;
    default:
      return theme.palette.info;
  }
};

const Button = styled(BaseButton)`
  box-shadow: ${props => props.theme.shadows[0]};
  text-decoration: none;
  &:hover {
    box-shadow: ${props => props.theme.shadows[0]};
  }
  color: ${props => getColorForState(props.theme, props.state).contrastText};

  ${props =>
    props.variant === "contained" &&
    css`
      background-color: ${getColorForState(props.theme, props.state).main};
      &:hover {
        background-color: ${getColorForState(props.theme, props.state).light};
      }
    `}
  }}
  ${props =>
    (props.variant === "text" || props.variant === "outlined") &&
    css`
      color: ${getColorForState(props.theme, props.state).main};
      &:hover {
        color: ${getColorForState(props.theme, props.state).light};
      }
    `}
  }}
  ${props =>
    props.variant === "outlined" &&
    css`
      border-color: ${getColorForState(props.theme, props.state).main};
      &:hover {
        border-color: ${getColorForState(props.theme, props.state).light};
      }
    `}
  }}
`;

export default Button;
