import React from "react";
import styled from "styled-components";

import MuiDialogContentText, {
  DialogContentTextProps
} from "@material-ui/core/DialogContentText";

const BaseDialogContentText = (props: DialogContentTextProps) => (
  <MuiDialogContentText {...props} />
);

const DialogContentText = styled(BaseDialogContentText)``;

export default DialogContentText;
