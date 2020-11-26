import React from "react";
import styled from "styled-components";

import MuiDialogContent, {
  DialogContentProps
} from "@material-ui/core/DialogContent";

const BaseDialogContent = (props: DialogContentProps) => (
  <MuiDialogContent {...props} />
);

const DialogContent = styled(BaseDialogContent)``;

export default DialogContent;
