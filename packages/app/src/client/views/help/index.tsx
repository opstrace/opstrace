import React, { useState } from "react";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from "@material-ui/icons/Close";
import { Box } from "client/components/Box";
import { useCommandService } from "client/services/Command";
import styled from "styled-components";

const FullPageDialog = styled(Dialog)`
  .MuiPaper-root {
    position: absolute;
    left: 50px;
    right: 0px;
    top: 0px;
    bottom: 0px;
    margin: 0px;
    max-width: none;
    max-height: none;
  }
`;

const Help = () => {
  const [open, setOpen] = useState(false);

  useCommandService(
    {
      id: "open-help-dialog",
      description: "Show Help",
      category: "View",
      disabled: open,
      keybindings: ["mod+h"],
      handler: e => {
        e.keyboardEvent?.preventDefault();
        setOpen(true);
      }
    },
    [open]
  );
  useCommandService(
    {
      id: "close-help-dialog",
      description: "Close Help",
      category: "View",
      disabled: !open,
      keybindings: ["escape"],
      handler: e => {
        e.keyboardEvent?.preventDefault();
        setOpen(false);
      }
    },
    [open]
  );

  return (
    <FullPageDialog open={open} onBackdropClick={() => setOpen(false)}>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between">
          <Box>Help</Box>
          <IconButton onClick={() => setOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box
          width="100%"
          height="100%"
          display="flex"
          justifyContent="center"
          alignItems="center"
          flexWrap="wrap"
        >
          placeholder
        </Box>
      </DialogContent>
    </FullPageDialog>
  );
};

export default Help;
