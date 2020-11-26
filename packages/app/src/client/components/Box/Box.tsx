import React from "react";
import MuiBox, { BoxProps as MuiBoxProps } from "@material-ui/core/Box";

export type BoxProps = MuiBoxProps;

const Box = (props: BoxProps) => <MuiBox {...props} />;

export default Box;
