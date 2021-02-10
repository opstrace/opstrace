/**
 * Copyright 2019-2021 Opstrace, Inc.
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
import MuiNativeSelect, {
  NativeSelectProps as MuiNativeSelectProps
} from "@material-ui/core/NativeSelect";
import InputBase from "@material-ui/core/InputBase";

import styled from "styled-components";

export type NativeSelectProps = MuiNativeSelectProps;

const BaseNativeSelect = (props: NativeSelectProps) => (
  <MuiNativeSelect {...props} input={<InputBase />}>
    {props.children}
  </MuiNativeSelect>
);

const NativeSelect = styled(BaseNativeSelect)`
  font-size: 13px;
  border-radius: 4px;
  border: 1px solid ${props => props.theme.palette.text.disabled};
  .MuiInputBase-input {
    color: ${props => props.theme.palette.text.disabled};
    padding-left: ${props => props.theme.spacing(1)}px;
    background-color: transparent;
  }
  .MuiNativeSelect-icon {
    color: ${props => props.theme.palette.text.disabled};
  }
  &:hover {
    .MuiNativeSelect-icon,
    .MuiInputBase-input {
      color: ${props => props.theme.palette.text.primary};
    }
  }
`;

export default NativeSelect;
