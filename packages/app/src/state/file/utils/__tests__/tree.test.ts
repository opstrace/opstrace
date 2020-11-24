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
import { getFileTree } from "../tree";

const file1 = {
  rebaseRequired: true,
  isNewModule: true,
  isNewFile: true,
  isDeletedFile: true,
  isModifiedFile: true,
  file: {
    branch_name: "branch-1",
    created_at: "2020-11-11",
    id: "file-1",
    is_modified: false,
    mark_deleted: false,
    module_name: "module-1",
    module_scope: "/",
    module_version: "0.1",
    path: "/",
    ext: "js"
  }
};

const file2 = {
  rebaseRequired: true,
  isNewModule: true,
  isNewFile: true,
  isDeletedFile: true,
  isModifiedFile: true,
  file: {
    branch_name: "branch-2",
    created_at: "2020-11-12",
    id: "file-2",
    is_modified: false,
    mark_deleted: false,
    module_name: "module-2",
    module_scope: "/foo",
    module_version: "0.2",
    path: "/",
    ext: "json"
  }
};

const file3 = {
  rebaseRequired: true,
  isNewModule: true,
  isNewFile: true,
  isDeletedFile: true,
  isModifiedFile: true,
  file: {
    branch_name: "branch-3",
    created_at: "2020-11-13",
    id: "file-3",
    is_modified: false,
    mark_deleted: false,
    module_name: "module-2",
    module_scope: "/foo",
    module_version: "1.2",
    path: "/",
    ext: "json"
  }
};

const mockFiles = [file1, file2, file3];

test("getFileTree returns correct tree structure", () => {
  const result = {
    directories: [
      {
        directories: [
          {
            directories: [],
            files: [file1],
            name: "module-1",
            path: "@/"
          }
        ],
        files: [],
        name: "@/",
        path: ""
      },
      {
        directories: [
          {
            directories: [],
            files: [file2, file3],
            name: "module-2",
            path: "@/foo"
          }
        ],
        files: [],
        name: "@/foo",
        path: ""
      }
    ],
    files: [],
    name: "",
    path: ""
  };
  expect(getFileTree(mockFiles)).toEqual(result);
});
