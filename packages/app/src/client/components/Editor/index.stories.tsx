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
import { Meta } from "@storybook/react";
import "./lib/workers";

import { Box } from "../Box";
import { EditorSkeleton, ModuleEditor } from "./index";
import TextFileModel from "state/file/TextFileModel";

export default {
  title: "Components/Editor"
} as Meta;

export const ReadOnly = (): JSX.Element => {
  const possiblyForkedFile = {
    file: {
      id: "3a813132-d8ad-4d0c-969f-c446c85ce1e0",
      ext: "tsx",
      path: "foo/bar/baz",
      module_name: "test",
      module_scope: "opstrace",
      module_version: "2.0.0",
      created_at: "2020-11-03T21:55:10.59863",
      branch_name: "main",
      base_file_id: null,
      mark_deleted: false,
      is_modified: false
    },
    isNewModule: false,
    isNewFile: false,
    isDeletedFile: false,
    isModifiedFile: false,
    rebaseRequired: false
  };
  const fileContents = `export default {
  title: "Components/Editor"
};

export const Default = (): JSX.Element => {
  const possiblyForkedFile = {
    file: {
      id: "3a813132-d8ad-4d0c-969f-c446c85ce1e0",
      ext: "tsx",
      path: "foo/bar/baz",
      module_name: "test",
      module_scope: "opstrace",
      module_version: "2.0.0",
      created_at: "2020-11-03T21:55:10.59863",
      branch_name: "main",
      base_file_id: null,
      mark_deleted: false,
      is_modified: false
    },
    isNewModule: false,
    isNewFile: false,
    isDeletedFile: false,
    isModifiedFile: false,
    rebaseRequired: false
  };
}
  `;
  const textFileModel = new TextFileModel(possiblyForkedFile, fileContents);

  return (
    <Box display="flex" width="100vw" height="100vh" p={1}>
      <ModuleEditor
        textFileModel={textFileModel}
        width={700}
        height={900}
        visible={true}
      />
    </Box>
  );
};

export const Loading = (): JSX.Element => {
  return (
    <Box display="flex" width="100vw" height="100vh" p={1}>
      <EditorSkeleton />
    </Box>
  );
};
