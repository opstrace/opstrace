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

import React, { useEffect, useRef, useState } from "react";
import Skeleton from "@material-ui/lab/Skeleton";
import {
  useBranchTypescriptFilesForModuleVersion,
  useOpenFileRequestParams
} from "state/file/hooks/useFiles";
import { getFileTree } from "state/file/utils/tree";
import { requestOpenFileWithParams } from "state/file/actions";
import TreeView from "./TreeView";
import {
  isFile,
  getFileFromId,
  getExpandedNodeIDsToExposeFile,
  getFileId
} from "./utils";
import { useDispatch } from "react-redux";
import { useSortedVersionsForModule } from "state/moduleVersion/hooks/useModuleVersions";
import { Box } from "../Box";
import { MinimalSelect } from "../Select";
import { useHistory } from "react-router-dom";
import { sanitizeFilePath } from "state/utils/sanitize";

interface ModuleTreeViewProps {
  moduleName: string;
  moduleScope: string;
  selected: string;
  onSelected: (id: string) => void;
}

const ModuleTreeView = ({
  moduleName,
  moduleScope,
  selected,
  onSelected
}: ModuleTreeViewProps) => {
  const dispatch = useDispatch();
  const history = useHistory();
  const versions = useSortedVersionsForModule(moduleName, moduleScope);
  const [version, setVersion] = useState<string>("");
  const [expanded, setExpanded] = useState<string[]>([]);
  const setDefaultExpandedToExposeFile = useRef(false);
  const overrideVersionForBrowsing = useRef(false);

  const {
    requestedModuleVersion,
    requestedModuleScope,
    requestedModuleName,
    requestedFilePath
  } = useOpenFileRequestParams();

  useEffect(() => {
    if (overrideVersionForBrowsing.current) {
      return;
    }
    if (
      version !== requestedModuleVersion &&
      requestedModuleVersion &&
      requestedModuleName === moduleName &&
      requestedModuleScope === moduleScope
    ) {
      setDefaultExpandedToExposeFile.current = false;
      setVersion(requestedModuleVersion);
    }

    if (version === "" && versions && versions.length) {
      if (
        requestedModuleVersion &&
        requestedModuleName === moduleName &&
        requestedModuleScope === moduleScope
      ) {
        // set to the requested version
        setVersion(requestedModuleVersion);
      } else {
        // set to latest version by default
        setVersion(versions[0].version);
      }
    }
  }, [
    versions,
    version,
    moduleName,
    moduleScope,
    requestedModuleVersion,
    requestedModuleScope,
    requestedModuleName
  ]);

  const possiblyForkedFiles = useBranchTypescriptFilesForModuleVersion(
    moduleName,
    moduleScope,
    version
  );

  const fileTree = getFileTree(possiblyForkedFiles);

  useEffect(() => {
    // this is true if the user selects a different version from the dropdown
    if (overrideVersionForBrowsing.current) {
      // only override for a single update - this could be brittle.
      overrideVersionForBrowsing.current = false;
      return;
    }
    if (
      requestedModuleScope === moduleScope &&
      requestedModuleName === moduleName &&
      requestedFilePath &&
      fileTree
    ) {
      const requestedFile = possiblyForkedFiles?.find(
        pff =>
          sanitizeFilePath(pff.file.path) ===
          sanitizeFilePath(requestedFilePath)
      );

      if (requestedFile && !setDefaultExpandedToExposeFile.current) {
        setDefaultExpandedToExposeFile.current = true;
        setExpanded(getExpandedNodeIDsToExposeFile(requestedFile));
        onSelected(getFileId(requestedFile.file));
      }
    }
  }, [
    requestedModuleScope,
    requestedModuleName,
    possiblyForkedFiles,
    requestedFilePath,
    moduleScope,
    onSelected,
    moduleName,
    fileTree
  ]);

  if (possiblyForkedFiles === null) {
    return null;
  }

  if (possiblyForkedFiles === undefined || versions === undefined) {
    return (
      <Box position="relative" height="25px" width="100%" p={0.6}>
        <Skeleton variant="rect" width="100%" height="100%" animation="wave" />
      </Box>
    );
  }
  // all files will be nested under the same directory. There is only one entry
  // in fileTree.directories because we're rendering files for the same module
  const moduleDirectory = fileTree.directories.length
    ? fileTree.directories[0]
    : null;

  const onNodeSelect = (event: React.ChangeEvent<{}>, id: [] | string) => {
    // id is only an array if multiSelect is true (which it isn't)
    const idString = id as string;
    if (isFile(idString)) {
      const fileId = getFileFromId(idString);

      const pff = possiblyForkedFiles.find(pff => pff.file.id === fileId);
      if (pff) {
        dispatch(
          requestOpenFileWithParams({
            history,
            params: {
              selectedFilePath: pff.file.path,
              selectedModuleName: pff.file.module_name,
              selectedModuleScope: pff.file.module_scope,
              selectedModuleVersion: pff.file.module_version
            }
          })
        );
      }
    }
    onSelected(idString);
  };

  const onNodeToggle = (event: React.ChangeEvent<{}>, ids: string[]) => {
    setExpanded(ids);
  };

  if (!moduleDirectory || !versions) {
    return null;
  }

  return (
    <Box position="relative">
      <TreeView
        onNodeSelect={onNodeSelect}
        data={moduleDirectory}
        selected={selected}
        onNodeToggle={onNodeToggle}
        expanded={expanded}
      />
      <Box position="absolute" top={0} right={0}>
        <MinimalSelect
          value={version}
          name="version"
          onChange={e => {
            overrideVersionForBrowsing.current = true;
            setVersion(e.target.value);
          }}
          inputProps={{ "aria-label": "version" }}
          style={{ marginTop: -4 }}
        >
          {versions.map(v => (
            <option key={v.version} value={v.version}>
              {v.version}
            </option>
          ))}
        </MinimalSelect>
      </Box>
    </Box>
  );
};

export default ModuleTreeView;
