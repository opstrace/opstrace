/**
 * Copyright 2020 Opstrace, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
