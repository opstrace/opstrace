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
import styled from "styled-components";
import CircularProgress, {
  CircularProgressProps
} from "@material-ui/core/CircularProgress";

import { Box } from "../Box";

const SpinnerBottom = styled(CircularProgress)<CircularProgressProps>`
  position: absolute;
  left: 0;
`;

const SpinnerTop = styled(CircularProgress)<CircularProgressProps>`
  position: absolute;
  left: 0;
  animation-duration: 550ms;
  circle {
    stroke-linecap: round;
  }
`;

export type SpinnerProps = {
  size?: number;
  center?: boolean;
};

const Spinner = ({ center, ...rest }: SpinnerProps) => {
  const size = rest.size || 20;
  const width = center ? "100%" : size;
  const height = center ? "100%" : size;

  return (
    <Box
      width={width}
      height={height}
      display="flex"
      justifyContent="center"
      alignItems="center"
    >
      <Box width={size} height={size} position="relative">
        <SpinnerBottom
          variant="determinate"
          size={size}
          thickness={4}
          {...rest}
          value={100}
        />
        <SpinnerTop
          variant="indeterminate"
          disableShrink
          size={size}
          thickness={4}
          {...rest}
        />
      </Box>
    </Box>
  );
};

export default Spinner;
