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
import List, { VirtualListRenderItemProps } from "./List";
import { ButtonListItem } from "./ListItem";
import ListItemSecondaryAction from "./ListItemSecondaryAction";
import ListItemText from "./ListItemText";
import { Box } from "../Box";

export default {
  title: "Components/List"
};

export const Default = (): JSX.Element => {
  const renderItem = ({ index }: VirtualListRenderItemProps) => {
    return (
      <ButtonListItem>
        <ListItemText id={`${index}`} primary={`item ${index + 1}`} />
        <ListItemSecondaryAction>
          secondary action {index}
        </ListItemSecondaryAction>
      </ButtonListItem>
    );
  };

  return (
    <Box display="flex" width="100vw" height="100vh" p={1}>
      <List
        renderItem={renderItem}
        items={new Array(100000).fill(true)}
        itemSize={() => 30}
      />
    </Box>
  );
};
