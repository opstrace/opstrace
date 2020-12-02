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

import { Box } from "../Box";
import Spinner from "./Spinner";

export default {
  title: "Components/Spinner"
};

export const Default = (): JSX.Element => {
  return (
    <React.Fragment>
      <Spinner size={20} center />
      <Box position="absolute" left={0} right={0} top={0} bottom={0}>
        <Spinner size={40} center />
      </Box>
    </React.Fragment>
  );
};
