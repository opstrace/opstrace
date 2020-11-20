import React from "react";

import ActivityBar from "./ActivityBar";
import Box from "client/components/Box/Box";

export default {
  title: "Views/Common/ActivityBar"
};

export const Default = (): JSX.Element => {
  return (
    <Box ml={1}>
      <ActivityBar activeTab={"/module"} />
    </Box>
  );
};
