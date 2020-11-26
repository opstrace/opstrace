import React from "react";
import styled from "styled-components";

import MuiDialogTitle, {
  DialogTitleProps
} from "@material-ui/core/DialogTitle";

const BaseDialogTitle = (props: DialogTitleProps) => (
  <MuiDialogTitle {...props} />
);

const DialogTitle = styled(BaseDialogTitle)``;

export default DialogTitle;
