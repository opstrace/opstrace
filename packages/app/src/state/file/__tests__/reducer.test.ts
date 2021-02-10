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
import { reducer as FileReducer } from "../reducer";
import * as actions from "../actions";
import TextFileModel from "state/file/TextFileModel";

const mockState = {
  files: [],
  selectedFileId: "",
  openFiles: [
    new TextFileModel({
      rebaseRequired: false,
      isNewModule: false,
      isNewFile: false,
      isDeletedFile: false,
      isModifiedFile: false,
      file: {
        id: "test",
        branch_name: "test-branch",
        created_at: "2020-11-11",
        ext: "0",
        is_modified: false,
        mark_deleted: false,
        module_name: "test-module",
        module_scope: "test-scope",
        module_version: "0.1",
        path: "foo/bar/baz"
      }
    })
  ],
  loading: true
};

test("return mock state", () => {
  const reducer = FileReducer(mockState, {} as any);

  expect(reducer).toEqual(mockState);
});

test("handle set action", () => {
  const files = [
    {
      id: "test-2",
      branch_name: "test-branch-2",
      created_at: "2020-11-12",
      ext: "0",
      is_modified: false,
      mark_deleted: false,
      module_name: "test-module-2",
      module_scope: "test-scope-2",
      module_version: "0.2",
      path: "foo/bar"
    }
  ];

  const reducer = FileReducer(mockState, actions.set(files));

  expect(reducer.files).toEqual(files);
  expect(reducer.loading).toBeFalsy();
});

test("handle openFile action", () => {
  const files = {
    rebaseRequired: false,
    isNewModule: false,
    isNewFile: false,
    isDeletedFile: false,
    isModifiedFile: false,
    file: {
      id: "test-2",
      branch_name: "test-branch-2",
      created_at: "2020-11-12",
      ext: "0",
      is_modified: false,
      mark_deleted: false,
      module_name: "test-module-2",
      module_scope: "test-scope-2",
      module_version: "0.2",
      path: "foo/bar"
    }
  };
  const reducer = FileReducer(mockState, actions.openFile(files));

  expect(reducer.openFiles.length).toEqual(2);
  expect(reducer.openFiles[1].file).toEqual(files.file);
});

test("handle closeFile action with unknown id", () => {
  const reducer = FileReducer(mockState, actions.closeFile("no-file"));

  expect(reducer).toEqual(mockState);
});

test("handle closeFile action", () => {
  const reducer = FileReducer(mockState, actions.closeFile("test"));

  expect(reducer.openFiles.length).toEqual(0);
});

test("handle requestOpenFileWithParams action", () => {
  const params = {
    selectedFilePath: "foo/bar/test",
    selectedModuleName: "module-123",
    selectedModuleScope: "scope-123",
    selectedModuleVersion: "1.1"
  };

  const reducer = FileReducer(
    mockState,
    actions.requestOpenFileWithParams({ history: {} as any, params })
  );

  expect(reducer).toEqual({ ...mockState, history: {}, params });
});
