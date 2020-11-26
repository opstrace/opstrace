import React from "react";
import Box from "@material-ui/core/Box";
import styled from "styled-components";

export type PanelProps = {
  children: React.ReactNode;
};

const PanelWrapper = styled(Box)`
  border-radius: 2px;
  overflow: hidden;
  border: 1px solid ${props => props.theme.palette.divider};
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const Panel = (props: PanelProps) => {
  return (
    <Box width="100%" height="100%" p={0.25} className="LayoutPanel">
      <PanelWrapper p={1}>{props.children}</PanelWrapper>
    </Box>
  );
};

Panel.displayName = "LayoutPanel";

export default Panel;
