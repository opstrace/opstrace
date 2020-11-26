import React from "react";
import styled from "styled-components";

import MuiDialogActions, {
  DialogActionsProps
} from "@material-ui/core/DialogActions";

const BaseDialogActions = (props: DialogActionsProps) => (
  <MuiDialogActions {...props} />
);

const DialogActions = styled(BaseDialogActions)``;

export default DialogActions;
