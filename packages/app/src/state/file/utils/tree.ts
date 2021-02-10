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
import { sanitizeScope, sanitizeFilePath } from "state/utils/sanitize";
import { IDirectory, IPossiblyForkedFile } from "../types";

/**
 * Builds a file tree from array of files
 */
export function getFileTree(files: IPossiblyForkedFile[] | null | undefined) {
  if (!files) {
    return {
      path: "",
      name: "",
      directories: [],
      files: []
    };
  }
  const tree = files.reduce<IDirectory>(
    (dir, pff) => {
      let cwd = dir;

      // add the module name to the beginning of the path
      // example with scope => @opstrace/prometheus
      // example without scope => prometheus
      const moduleDirs = pff.file.module_scope
        ? [`@${sanitizeScope(pff.file.module_scope)}`, pff.file.module_name]
        : [pff.file.module_name];

      const dirs = moduleDirs.concat(
        sanitizeFilePath(pff.file.path).split("/")
      );
      // pop the filename off
      dirs.pop();

      dirs.forEach((dir, depth) => {
        const existingDirectory = cwd.directories.find(
          ({ name }) => name === dir
        );
        if (!existingDirectory) {
          const newDirectory = {
            path: dirs.slice(0, depth).join("/"),
            name: dir,
            directories: [],
            files: []
          };
          cwd.directories.push(newDirectory);
          cwd = newDirectory;
        } else {
          cwd = existingDirectory;
        }
      });
      // add file
      cwd.files.push(pff);

      return dir;
    },
    {
      path: "",
      name: "",
      files: [],
      directories: []
    }
  );

  return tree;
}

export function getFilePathObjects(
  tree: IDirectory,
  moduleScope: string,
  moduleName: string,
  path: string
) {
  const parts: (IDirectory | IPossiblyForkedFile)[] = [];
  const filePathParts = sanitizeFilePath(path).split("/");
  const pathParts = moduleScope
    ? [moduleScope, moduleName, ...filePathParts]
    : [moduleName, ...filePathParts];

  // pop the filename off and discard because we don't need it
  pathParts.pop();

  let cwd = tree;
  pathParts.forEach(name => {
    const childDirectory = cwd.directories.find(d => d.name === name);
    if (childDirectory) {
      parts.push(childDirectory);
      cwd = childDirectory;
    }
  });
  const file = cwd.files.find(
    f => sanitizeFilePath(f.file.path) === sanitizeFilePath(path)
  );
  if (file) {
    parts.push(file);
  }

  return parts;
}
