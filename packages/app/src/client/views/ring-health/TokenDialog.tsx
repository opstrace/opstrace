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

import { Box } from "client/components/Box";
import { Dialog, DialogTitle } from "client/components/Dialog";
import React from "react";

type Props = {
  tokens?: Array<number>,
  onClose: () => void
}

const TokenDialog = ({ tokens, onClose }: Props) => {
  return (
    <Dialog open={!!tokens} onClose={onClose} aria-labelledby="simple-dialog-title">
      <DialogTitle id="simple-dialog-title">Tokens</DialogTitle>
      <Box pl={3} width={300} height={500}>
        {tokens?.map(token => (
          <div key={token}>
            {token}
          </div>
        ))}
      </Box>
    </Dialog>
  );
};

export default TokenDialog