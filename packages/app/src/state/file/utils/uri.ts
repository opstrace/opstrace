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
import { sanitizeScope, sanitizeFileExt } from "state/utils/sanitize";
import { File } from "../types";

export function getModuleNameFromFile(file: File) {
  return file.module_scope
    ? `@${sanitizeScope(file.module_scope)}/${file.module_name}`
    : file.module_name;
}

export function getFileUri(
  file: File,
  options?: {
    useLatest?: boolean;
    branch?: string;
    version?: string;
    ext?: boolean;
  }
) {
  const versionToUse = options?.useLatest ? "latest" : file.module_version;

  const filePath = `${getModuleNameFromFile(file)}/${
    options?.version ? options.version : versionToUse
  }/${file.path.replace(/^\//, "")}`;

  const possiblyWithBranch = options?.branch
    ? `${options.branch}/${filePath}`
    : filePath;
  return options?.ext
    ? `${possiblyWithBranch}.${sanitizeFileExt(file.ext)}`
    : possiblyWithBranch;
}

export function getMonacoFileUriString(file: File) {
  return `module://${file.id}.${sanitizeFileExt(file.ext)}`;
}

export function getMonacoFileUri(file: File) {
  return monaco.Uri.parse(getMonacoFileUriString(file));
}
