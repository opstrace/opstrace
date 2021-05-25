/**
 * Copyright 2021 Opstrace, Inc.
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

import React, { useEffect, useMemo } from "react";

import useWindowSize from "client/hooks/useWindowSize";

import { YamlEditor } from "client/components/Editor";

import { Button } from "client/components/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import { Box } from "client/components/Box";

export const ViewConfigDialogBtn = ({
  filename,
  config
}: {
  filename: string;
  config: string;
}) => {
  const size = useWindowSize();
  const [open, setOpen] = React.useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const descriptionElementRef = React.useRef<HTMLElement>(null);

  useEffect(() => {
    if (open) {
      const { current: descriptionElement } = descriptionElementRef;
      if (descriptionElement !== null) {
        descriptionElement.focus();
      }
    }
  }, [open]);

  const [width, height] = useMemo(() => {
    const maxWidth = 1000;

    const width = size.width > maxWidth ? maxWidth : size.width;
    const height = size.height;

    return [width, height];
  }, [size.width, size.height]);

  return (
    <>
      <Button variant="outlined" size="small" onClick={handleOpen}>
        View YAML
      </Button>
      <Dialog open={open} onClose={handleClose} scroll="paper" maxWidth="lg">
        <DialogTitle>{filename}</DialogTitle>
        <DialogContent dividers={true}>
          <DialogContentText ref={descriptionElementRef} tabIndex={-1}>
            <Box width={`${width}px`} height={`${height}px`}>
              <YamlEditor
                filename={filename}
                data={config}
                configViewer={true}
              />
            </Box>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
