import React from "react";

import { Box } from "../Box";
import SplitPane from "./SplitPane";

export default {
  title: "Components/SplitPane"
};

export const Default = (): JSX.Element => {
  return (
    <SplitPane split="vertical" size={400}>
      <Box p={1}>first pane</Box>
      <Box p={1}>second pane</Box>
    </SplitPane>
  );
};
