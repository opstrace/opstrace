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

import TextFileModel from "state/file/TextFileModel";

import AutoSizer, { Size } from "react-virtualized-auto-sizer";

import { Box } from "client/components/Box";
import ModuleOutputSkeleton from "./ModuleOutputSkeleton";
import { Scrollable } from "client/components/Scrollable";

interface ModuleOutputProps {
  textFileModel?: TextFileModel | null;
}

const ModuleOutput = ({ textFileModel }: ModuleOutputProps) => {
  const contentLoading = textFileModel === undefined;

  return (
    <AutoSizer>
      {({ height, width }: Size) => {
        return (
          <Box position="absolute" width="100%" height="100%">
            <Scrollable>
              <Box
                p={0}
                justifyContent="left"
                alignItems="normal"
                data-testid="module-output"
              >
                {() => {
                  if (contentLoading) {
                    return (
                      <ModuleOutputSkeleton minHeight={height} width={width} />
                    );
                  }
                  return (
                    <ModuleOutputSkeleton minHeight={height} width={width} />
                  );
                }}
              </Box>
            </Scrollable>
          </Box>
        );
      }}
    </AutoSizer>
  );
};

export default ModuleOutput;
