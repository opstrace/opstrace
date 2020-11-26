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
