/**
 * Copyright 2019-2021 Opstrace, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { useState } from "react";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from "@material-ui/icons/Close";
import { Box } from "client/components/Box";
import { useCommandService } from "client/services/Command";
import styled from "styled-components";
import { Typography } from "client/components/Typography";

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

  const isMacLike = /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform);

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
          <Box>
            <Box p={2} width="100%" textAlign="center">
              <Typography variant="h6" color="textSecondary">
                {isMacLike ? "⌘ + p" : "⌃ + p"}
              </Typography>
            </Box>
            <Box p={2}>
              <Typography>
                Use the command pallete to navigate with contextual commands.
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>
    </FullPageDialog>
  );
};

export default Help;
