import React from "react";
import Divider from "@material-ui/core/Divider";
import Box from "../Box/Box";
import Typography from "../Typography/Typography";

export type SideBarContainerProps = {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

const SideBarContainer = (props: SideBarContainerProps) => {
  return (
    <>
      <Box p={2} display="flex" position="relative">
        <Box flexGrow={1}>
          <Typography variant="caption" style={{ fontWeight: 700 }}>
            {props.title.toUpperCase()}
          </Typography>
        </Box>
        <Box position="absolute" right={8} top={10}>
          {props.actions}
        </Box>
      </Box>
      <Divider />
      <Box p={1}>{props.children}</Box>
    </>
  );
};

export default SideBarContainer;
