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
