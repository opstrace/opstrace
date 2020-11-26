import React from "react";
import MuiBox, { BoxProps as MuiBoxProps } from "@material-ui/core/Box";

export type PageProps = MuiBoxProps;

const Page = (props: PageProps) => (
  <MuiBox
    width="100vw"
    height="100vh"
    display="flex"
    justifyContent="center"
    alignItems="center"
    flexWrap="wrap"
    p={1}
    {...props}
  />
);

export default Page;
