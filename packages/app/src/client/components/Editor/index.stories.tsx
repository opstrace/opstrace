import React from "react";
import "./lib/workers";

import { Box } from "../Box";
import { EditorSkeleton, ModuleEditor } from "./index";
import TextFileModel from "state/file/TextFileModel";

export default {
  title: "Components/Editor"
};

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
      <ModuleEditor textFileModel={textFileModel} />
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
