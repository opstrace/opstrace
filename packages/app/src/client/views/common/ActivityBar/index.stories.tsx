import React from "react";

import ActivityBar from "./ActivityBar";
import Box from "../Box/Box";

export default {
  title: "Components/ActivityBar"
};

export const Default = (): JSX.Element => {
  return (
    <Box ml={1}>
      <ActivityBar activeTab={"/m"} />
    </Box>
  );
};
