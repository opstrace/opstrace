/**
 * Copyright 2020 Opstrace, Inc.
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

import React from "react";
import Box from "@material-ui/core/Box";
import * as constants from "./constants";
import Panel from "./Panel";

export type ColumnProps = {
  minHeight?: number;
  children: React.ReactNode;
};

const Column = (props: ColumnProps) => {
  let children = props.children;

  return (
    <Box
      flexGrow={1}
      display="flex"
      flexDirection="column"
      minHeight={props.minHeight || constants.MIN_ITEM_HEIGHT}
      minWidth={constants.MIN_ITEM_WIDTH}
      className="LayoutColumn"
    >
      <Panel minHeight={props.minHeight}>{children}</Panel>
    </Box>
  );
};

Column.displayName = "LayoutColumn";

export default Column;
