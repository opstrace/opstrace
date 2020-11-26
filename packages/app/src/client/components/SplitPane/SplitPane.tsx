import React from "react";
import styled from "styled-components";
import ReactSplitPane from "react-split-pane";
import { Box } from "../Box";
import { ITheme } from "client/themes";

export type SplitPaneProps = {
  children: React.ReactNode[];
  onDrag?: (isDragging: boolean) => {};
  split: "vertical" | "horizontal";
  size: number;
  minSize?: number;
};

function SplitPane({
  children,
  onDrag,
  split,
  size,
  minSize = 0
}: SplitPaneProps) {
  if (children.length !== 2) {
    throw Error("SplitPane only supports two immediate children");
  }

  const onDragStarted = () => {
    onDrag && onDrag(true);
  };

  const onDragFinished = () => {
    onDrag && onDrag(false);
  };

  return (
    <StyledSplitPane
      minSize={minSize}
      split={split}
      onDragStarted={onDragStarted}
      onDragFinished={onDragFinished}
      size={size}
    >
      <Box height="100%" width="100%">
        {children[0]}
      </Box>
      <Box height="100%" width="100%">
        {children[1]}
      </Box>
    </StyledSplitPane>
  );
}

const getResizerHoverColor = (theme: ITheme) =>
  theme.palette.type === "dark"
    ? "rgba(255, 255, 255, 0.1)"
    : "rgba(0, 0, 0, 0.05)";

const StyledSplitPane = styled(ReactSplitPane)`
  .Pane {
    max-width: 98% !important;
    overflow: hidden;
  }

  .Resizer {
    transform: translateZ(0);
    background-color: ${props => props.theme.palette.divider};
    opacity: 1;
    z-index: 50;
    box-sizing: border-box;
    background-clip: padding-box;
  }

  .Resizer.horizontal {
    height: 11px;
    margin: -5px 0;
    border-top: 5px solid transparent;
    border-bottom: 5px solid transparent;
    cursor: row-resize;
    width: 100%;
  }

  .Resizer.horizontal:hover {
    // border-top: 5px solid ${props => getResizerHoverColor(props.theme)};
    // border-bottom: 5px solid ${props => getResizerHoverColor(props.theme)};
  }

  .Resizer.vertical {
    width: 11px;
    margin: 0 -5px;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    cursor: col-resize;
  }

  .Resizer.vertical:hover {
    // border-left: 5px solid ${props => getResizerHoverColor(props.theme)};
    // border-right: 5px solid ${props => getResizerHoverColor(props.theme)};
  }
  .Resizer.disabled {
    cursor: not-allowed;
  }
  .Resizer.disabled:hover {
    border-color: transparent;
  }
`;

export default SplitPane;
