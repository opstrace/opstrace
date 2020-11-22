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
import {
  getModuleNameFromFile,
  getFileUri,
  getMonacoFileUriString
} from "../uri";

const mockFile = {
  branch_name: "branch-1",
  created_at: "2020-11-11",
  id: "file-1",
  is_modified: false,
  mark_deleted: false,
  module_name: "module-1",
  module_scope: "/foo/bar",
  module_version: "0.1",
  path: "/test",
  ext: "ts"
};

test("getModuleNameFromFile returns correct module name", () => {
  expect(getModuleNameFromFile(mockFile)).toEqual("@/foo/bar/module-1");
});

test("getModuleNameFromFile returns correct module name if file hasn't module_scope", () => {
  const file = { ...mockFile, module_scope: "" };

  expect(getModuleNameFromFile(file)).toEqual("module-1");
});

test("getFileUri returns correct path", () => {
  expect(getFileUri(mockFile)).toEqual("@/foo/bar/module-1/0.1/test");
});

test("getFileUri returns correct path with latest version", () => {
  const options = {
    useLatest: true
  };

  expect(getFileUri(mockFile, options)).toEqual(
    "@/foo/bar/module-1/latest/test"
  );
});

test("getFileUri returns correct path with files ext", () => {
  const options = {
    ext: true
  };

  expect(getFileUri(mockFile, options)).toEqual(
    "@/foo/bar/module-1/0.1/test.ts"
  );
});

test("getFileUri returns correct path with given version", () => {
  const options = {
    version: "1.5"
  };

  expect(getFileUri(mockFile, options)).toEqual("@/foo/bar/module-1/1.5/test");
});

test("getFileUri returns correct path with given branch", () => {
  const options = {
    branch: "new"
  };

  expect(getFileUri(mockFile, options)).toEqual(
    "new/@/foo/bar/module-1/0.1/test"
  );
});

test("getMonacoFileUriString returns correct path", () => {
  expect(getMonacoFileUriString(mockFile)).toEqual("module://file-1.ts");
});
