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

import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from "client/components/Dialog";
import React from "react";
import useMediaQuery from "@material-ui/core/useMediaQuery";
import { useTheme } from "@material-ui/core/styles";
import { Button } from "client/components/Button";
import Grid from "@material-ui/core/Grid";

type Props = {
  tokens?: Array<number>;
  onClose: () => void;
};

const TokenDialog = ({ tokens, onClose }: Props) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Dialog
      fullScreen={fullScreen}
      open={!!tokens}
      onClose={onClose}
      aria-labelledby="token-dialog"
    >
      <DialogTitle id="token-dialog">Tokens</DialogTitle>
      <DialogContent>
        <DialogContentText>
          <Grid container spacing={3}>
            {tokens?.map(token => (
              <Grid item xs={12} sm={6} md={4}>
                <div>{token}</div>
              </Grid>
            ))}
          </Grid>
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button autoFocus onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TokenDialog;
