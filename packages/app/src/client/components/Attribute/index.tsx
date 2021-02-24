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

import React, { ReactNode } from "react";

import { Box } from "client/components/Box";

import Typography from "client/components/Typography/Typography";

export const Key = (props: { children: ReactNode }) => (
  <Box pt={2} pb={2}>
    <Typography variant="h6" color="textSecondary">
      {props.children}
    </Typography>
  </Box>
);

export const Value = (props: { children: ReactNode }) => (
  <Box p={3} pt={2} pb={2}>
    <Typography variant="h6">{props.children}</Typography>
  </Box>
);

const attribute = { Key, Value };

export default attribute;
