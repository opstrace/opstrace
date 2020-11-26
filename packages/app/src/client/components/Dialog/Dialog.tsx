import React from "react";
import styled from "styled-components";

import MuiDialog, { DialogProps } from "@material-ui/core/Dialog";

const BaseDialog = styled(MuiDialog)`
  .MuiDialog-paper {
    border: 1px solid ${props => props.theme.palette.grey[800]};
  }
`;

const Dialog = (props: DialogProps) => <BaseDialog {...props} />;

export default Dialog;
