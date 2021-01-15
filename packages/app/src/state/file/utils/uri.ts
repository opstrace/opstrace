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

export function getModuleNameFromFile(file: {
  module_name: string;
  module_scope: string;
}) {
  return file.module_scope
    ? `@${sanitizeScope(file.module_scope)}/${file.module_name}`
    : file.module_name;
}

export function getFileUri(
  file: {
    module_version: string;
    module_scope: string;
    module_name: string;
    path: string;
  },
  options?: {
    useLatest?: boolean;
    branch?: string;
    version?: string;
    ext?: boolean;
    encodeAtSymbol?: boolean;
  }
) {
  const versionToUse = options?.useLatest ? "latest" : file.module_version;

  const filePath = `${getModuleNameFromFile(file)}${
    options?.encodeAtSymbol ? "%40" : "@"
  }${options?.version ? options.version : versionToUse}/${file.path.replace(
    /^\//,
    ""
  )}`;

  const possiblyWithBranch = options?.branch
    ? `${options.branch}/${filePath}`
    : filePath;
  return options?.ext ? `${possiblyWithBranch}.tsx` : possiblyWithBranch;
}

export function getMonacoFileUriString(file: {
  module_version: string;
  module_scope: string;
  module_name: string;
  branch_name: string;
  path: string;
}) {
  return getMonacoFileUri(file).fsPath;
}

export function getMonacoFileUri(file: {
  module_version: string;
  module_scope: string;
  module_name: string;
  branch_name: string;
  path: string;
}) {
  return monaco.Uri.file(
    getFileUri(file, {
      ext: true,
      branch: file.branch_name
    })
  );
}

const fileImportUriFormat = /^\/([^/]+)\/((?:@[^/@]+\/)?[^/@]+)(?:@([^/]+))?(\/.*)?$/;

export function parseFileImportUri(uri: string) {
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
  const fileName = (match[4] || "main").replace(/\/\/+/g, "/");
  const fileNameParts = fileName.split(".");
  let path = fileName;
  let ext = "tsx";
  if (fileNameParts.length > 1) {
    ext = fileNameParts.pop()!;
    path = fileNameParts.join(".");
  } else if (fileNameParts.length === 1) {
    path = fileNameParts[0];
  }

  return {
    branch_name: branch,
    module_name: scope ? module.split("/")[1] : module,
    module_scope: sanitizeScope(scope),
    module_version: version,
    path: sanitizeFilePath(path),
    ext: sanitizeFileExt(ext)
  };
}
