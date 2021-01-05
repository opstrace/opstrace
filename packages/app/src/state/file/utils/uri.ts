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
  sanitizeScope,
  sanitizeFileExt,
  sanitizeFilePath
} from "state/utils/sanitize";
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
    useVersionAtSymbol?: boolean;
  }
) {
  const versionToUse = options?.useLatest ? "latest" : file.module_version;

  const filePath = `${getModuleNameFromFile(file)}${
    options?.useVersionAtSymbol ? "@" : "/"
  }${options?.version ? options.version : versionToUse}/${file.path.replace(
    /^\//,
    ""
  )}`;

  const possiblyWithBranch = options?.branch
    ? `${options.branch}/${filePath}`
    : filePath;
  return options?.ext
    ? `${possiblyWithBranch}.${sanitizeFileExt(file.ext)}`
    : possiblyWithBranch;
}

export function getMonacoFileUriString(file: File) {
  return `module://${getFileUri(file, {
    ext: true,
    useVersionAtSymbol: true
  })}`;
}

export function getMonacoFileUri(file: File) {
  return monaco.Uri.parse(getMonacoFileUriString(file));
}

const fileImportUriFormat = /^\/([^/]+)\/((?:@[^/@]+\/)?[^/@]+)(?:@([^/]+))?(\/.*)?$/;

export function parseFileUri(uri: string) {
  try {
    uri = decodeURIComponent(uri);
    // add leading "/" if doesn't exist
    uri = uri.startsWith("/") ? uri : "/" + uri;
  } catch (error) {
    return null;
  }

  const match = fileImportUriFormat.exec(uri);

  if (match == null) return null;

  const branch = match[1];
  const module = match[2];
  const scope = module.split("/").length > 1 ? module.split("/")[0] : "";
  const version = match[3] || "latest";
  const fileName = (match[4] || "").replace(/\/\/+/g, "/");
  const fileNameParts = fileName.split(".");
  let path = fileName;
  let ext = "";
  if (fileNameParts.length) {
    ext = fileNameParts.pop()!;
    path = fileNameParts.join(".");
  }

  return {
    branch,
    module: scope ? module.split("/")[1] : module,
    scope: sanitizeScope(scope),
    version,
    path: sanitizeFilePath(path),
    ext: sanitizeFileExt(ext)
  };
}

export function parseFileUriWithoutBranch(uri: string) {
  // append branch for the parseFileUri to work (don't care about the branch value here)
  const attrs = parseFileUri("/main/" + uri.replace(/^\//, ""));
  if (!attrs) {
    return null;
  }
  const { module, scope, version, path, ext } = attrs;
  return {
    module,
    scope,
    version,
    path,
    ext
  };
}
