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

import React from "react";
import styled from "styled-components";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import { IDirectory, IPossiblyForkedFile } from "state/file/types";
import Typography from "../Typography/Typography";
import { getDirectoryId, getFileId } from "./utils";

import MuiTreeView, {
  TreeViewProps as MuiTreeViewProps
} from "@material-ui/lab/TreeView";

import MuiTreeItem, {
  TreeItemProps as MuiTreeItemProps
} from "@material-ui/lab/TreeItem";

import { ITheme } from "client/themes";
import { Box } from "../Box";

export type TreeItemProps = MuiTreeItemProps;

const BaseTreeViewItem = (props: TreeItemProps) => {
  return (
    <MuiTreeItem
      {...props}
      TransitionProps={{
        timeout: 0
      }}
    />
  );
};

const FileItem = (ppf: IPossiblyForkedFile) => {
  return (
    <Box display="flex" alignItems="center" pt={0.5} pb={0.5}>
      <Box flexGrow={1} p={0}>
        <Typography variant="body2">
          {ppf.file.path.split("/").pop()}
        </Typography>
      </Box>
    </Box>
  );
};

const DirectoryItem = (dir: IDirectory) => {
  return (
    <Box display="flex" alignItems="center" pt={0.5} pb={0.5}>
      <Box flexGrow={1} p={0}>
        <Typography variant="body2">{dir.name}</Typography>
      </Box>
    </Box>
  );
};

const renderModule = (ppf: IPossiblyForkedFile) => (
  <BaseTreeViewItem
    key={getFileId(ppf.file)}
    nodeId={getFileId(ppf.file)}
    label={FileItem(ppf)}
  />
);

// Recursively render tree
const renderDirectory = (dir: IDirectory) => (
  <BaseTreeViewItem
    key={getDirectoryId(dir)}
    nodeId={getDirectoryId(dir)}
    label={DirectoryItem(dir)}
  >
    {dir.files.map(file => renderModule(file))}
    {dir.directories.map(childDirectory => renderDirectory(childDirectory))}
  </BaseTreeViewItem>
);

export type TreeViewProps = MuiTreeViewProps & {
  data?: IDirectory;
};

const BaseTreeView = ({ data, ...rest }: TreeViewProps) => {
  if (!data) {
    return null;
  }

  return (
    <MuiTreeView
      {...rest}
      defaultCollapseIcon={<ExpandMoreIcon color="disabled" />}
      defaultExpandIcon={<ChevronRightIcon color="disabled" />}
    >
      {renderDirectory(data)}
    </MuiTreeView>
  );
};

const getSelectedBackgroundColor = (theme: ITheme) =>
  theme.palette.type === "dark"
    ? theme.palette.grey[900]
    : theme.palette.grey[200];

const TreeView = styled(BaseTreeView)`
  .MuiTreeItem-root.Mui-selected > .MuiTreeItem-content .MuiTreeItem-label {
    background-color: ${props => getSelectedBackgroundColor(props.theme)};
    color: ${props => props.theme.palette.text.primary};
  }
  .MuiTreeItem-content {
    color: ${props => props.theme.palette.text.secondary};
  }
  .MuiTreeItem-group {
    margin-left: 8px;
    border-left: 1px solid ${props => props.theme.palette.divider};
  }
`;

export default TreeView;
