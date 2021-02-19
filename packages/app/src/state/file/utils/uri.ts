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

export function getFileAttributesFromUri(uri: string) {
  const parts = uri.split("/");
  if (parts.length < 4) {
    throw Error(`invalid file uri: ${uri}`);
  }
  const branch = parts.shift();
  let scope = "";

  if (parts[0].startsWith("@")) {
    scope = String(parts.shift());
  }
  const module = parts.shift();
  const version = parts.shift();
  const path = parts.join("/").split(".").slice(0, -1).join(".");
  const [ext] = uri.split(".").slice(-1);

  if (!branch || !module || !version || !path || !ext) {
    throw Error(`invalid file uri: ${uri}`);
  }

  return {
    branch,
    scope,
    module,
    version,
    path,
    ext
  };
}

export function getMonacoFileUriString(file: File) {
  return `module://${file.id}.${sanitizeFileExt(file.ext)}`;
}

export function getMonacoFileUri(file: File) {
  return monaco.Uri.parse(getMonacoFileUriString(file));
}
