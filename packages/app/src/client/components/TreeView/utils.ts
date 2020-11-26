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

import { File, IDirectory, IPossiblyForkedFile } from "state/file/types";
import { sanitizeScope, sanitizeFilePath } from "state/utils/sanitize";

export function getDirectoryId(dir: IDirectory) {
  if (!dir.path) {
    return `dir:${dir.name}`;
  }
  return `dir:${sanitizeFilePath(dir.path)}/${dir.name}`;
}

export function getFileId(file: File) {
  return "file:" + file.id;
}

export function isDirectory(nodeId: string) {
  return nodeId.startsWith("dir:");
}

export function isFile(nodeId: string) {
  return nodeId.startsWith("file:");
}

export function getDirectoryFromId(nodeId: string) {
  return sanitizeFilePath(nodeId.replace(/^dir:/, ""));
}

export function getFileFromId(nodeId: string) {
  return nodeId.replace(/^file:/, "");
}

export function getExpandedNodeIDsToExposeFile(pff: IPossiblyForkedFile) {
  const expandedIds = pff.file.module_scope
    ? [
        `dir:@${sanitizeScope(pff.file.module_scope)}`,
        `dir:@${sanitizeScope(pff.file.module_scope)}/${pff.file.module_name}`
      ]
    : [`dir:${pff.file.module_name}`];

  const paths = sanitizeFilePath(pff.file.path).split("/");
  // pop the name off the paths - not needed when building directory ids
  paths.pop();
  paths.forEach(folderName => {
    const parentId = expandedIds[expandedIds.length - 1];
    expandedIds.push(`${parentId}/${folderName}`);
  });
  expandedIds.push(getFileId(pff.file));

  return expandedIds;
}
