import React from "react";
import Box from "../Box/Box";
import { Scrollable } from "../Scrollable/Scrollable";

export type SideBarProps = {
  children: React.ReactNode;
};

const SideBar = (props: SideBarProps) => {
  return (
    <Scrollable>
      <Box
        display="flex"
        flexDirection="column"
        p={0}
        minWidth="200px"
        overflow="hidden"
      >
        {props.children}
      </Box>
    </Scrollable>
  );
};

export default SideBar;
