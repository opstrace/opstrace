import React from "react";
import Box from "../Box/Box";

export type SideBarProps = {
  children: React.ReactNode;
};

const SideBar = (props: SideBarProps) => {
  return (
    <Box
      display="flex"
      flexDirection="column"
      p={0}
      minWidth="200px"
      minHeight="100%"
      overflow="hidden"
    >
      {props.children}
    </Box>
  );
};

export default SideBar;
