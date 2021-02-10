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
import { isTypescriptFile } from "../fileType";

const mockFile = {
  branch_name: "branch-1",
  created_at: "2020-11-11",
  id: "file-1",
  is_modified: false,
  mark_deleted: false,
  module_name: "module-1",
  module_scope: "",
  module_version: "0.1",
  path: "/"
};

test("isTypescriptFile returns that file is typescript file", () => {
  const file = { ...mockFile, ext: "ts" };

  expect(isTypescriptFile(file)).toBeTruthy();
});

test("isTypescriptFile returns that file is not typescript file", () => {
  const file = { ...mockFile, ext: "js" };

  expect(isTypescriptFile(file)).toBeFalsy();
});
