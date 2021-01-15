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

import React, { useEffect, useState } from "react";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import AutoSizer, { Size } from "react-virtualized-auto-sizer";
import { useFocusedOpenFile, useOpenFiles } from "state/file/hooks/useFiles";
import ModuleEditor from "./ModuleEditor";
import { Box } from "client/components/Box";
import { useDispatch } from "react-redux";
import { closeFile, requestOpenFileWithParams } from "state/file/actions";
import { useHistory } from "react-router-dom";
import { Typography } from "client/components/Typography";
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from "@material-ui/icons/Close";
import { useCommandService } from "client/services/Command";
import EditorViewers from "./EditorViewers";

function AutoSizingEditorGroup() {
  return (
    <AutoSizer>
      {({ height, width }: Size) => {
        return <ModuleEditorGroup height={height} width={width} />;
      }}
    </AutoSizer>
  );
}

type ResizableModuleEditorGroupProps = {
  height: number;
  width: number;
};

function ModuleEditorGroup({ height, width }: ResizableModuleEditorGroupProps) {
  const openFiles = useOpenFiles();
  const dispatch = useDispatch();
  const focussedFile = useFocusedOpenFile();
  const history = useHistory();
  const [tabIndex, setTabIndex] = useState(
    focussedFile
      ? openFiles.findIndex(f => f.file.id === focussedFile.file.id)
      : 0
  );

  useEffect(() => {
    setTabIndex(
      focussedFile
        ? openFiles.findIndex(f => f.file.id === focussedFile.file.id)
        : 0
    );
  }, [openFiles, focussedFile]);

  const changeTab = (idx: number) => {
    const file = openFiles[idx].file;
    dispatch(
      requestOpenFileWithParams({
        history,
        params: {
          selectedFilePath: file.path,
          selectedModuleName: file.module_name,
          selectedModuleScope: file.module_scope,
          selectedModuleVersion: file.module_version
        }
      })
    );
  };

  const handleChange = (event: React.ChangeEvent<{}>, idx: number) => {
    changeTab(idx);
  };

  useCommandService(
    {
      id: "select-editor-left",
      description: "Select Editor ⬅️",
      handler: e => {
        e.keyboardEvent?.preventDefault();
        changeTab(tabIndex === 0 ? openFiles.length - 1 : tabIndex - 1);
      },
      keybindings: ["mod+control+left"]
    },
    [tabIndex]
  );
  useCommandService(
    {
      id: "select-editor-right",
      description: "Select Editor ➡️",
      handler: e => {
        e.keyboardEvent?.preventDefault();
        changeTab(tabIndex === openFiles.length - 1 ? 0 : tabIndex + 1);
      },
      keybindings: ["mod+control+right"]
    },
    [tabIndex]
  );

  return (
    <Box width={width} height={height}>
      <Tabs
        style={{
          width
        }}
        value={tabIndex}
        onChange={handleChange}
        indicatorColor="primary"
        variant="scrollable"
        scrollButtons="auto"
        aria-label="editors"
      >
        {openFiles.map(file => (
          <Tab
            key={`editor-tab-${file.file.id}`}
            component="div"
            label={
              <span>
                <Typography color="textSecondary" variant="button">
                  {file.file.module_name}/
                </Typography>
                <Typography variant="button">{file.file.path}</Typography>
                {openFiles.length > 1 && (
                  <IconButton
                    style={{ fontSize: 10, marginLeft: 3 }}
                    size="small"
                    onClick={e => {
                      e.stopPropagation();
                      setTabIndex(tabIndex === 0 ? 0 : tabIndex - 1);
                      dispatch(closeFile(file.file.id));
                    }}
                  >
                    <CloseIcon fontSize="inherit" />
                  </IconButton>
                )}
              </span>
            }
          />
        ))}
      </Tabs>
      <EditorViewers />
        <ModuleEditor
          width={width}
          height={focussedFile?.live ? height - 48 - 50 : height - 48}
          visible={true}
        />
    </Box>
  );
}

export default React.memo(AutoSizingEditorGroup);
