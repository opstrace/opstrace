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
import semverGt from "semver/functions/gt";

import { getFileUri } from "../utils/uri";
import { File, Files, IPossiblyForkedFile } from "../types";

export default function getPossiblyForkedFilesForModuleVersion(
  files: Files,
  isNewModule: boolean,
  version: string,
  latestMainVersion?: string
) {
  const filesByUri = new Map<string, File>();
  const filesById = new Map<string, File>();
  files.forEach(f => {
    const uri = getFileUri(f, { branch: f.branch_name });
    filesByUri.set(uri, f);
    filesById.set(f.id, f);
  });

  const results: IPossiblyForkedFile[] = [];

  files.forEach(file => {
    if (file.module_version !== version) {
      // only return the files that match the version
      return;
    }

    const baseFile = file.base_file_id && filesById.get(file.base_file_id);
    const latestBaseFile =
      baseFile &&
      filesByUri.get(
        getFileUri(file, {
          branch: "main",
          version: latestMainVersion
        })
      );
    const rebaseRequired = !!(
      baseFile &&
      latestBaseFile &&
      semverGt(latestBaseFile.module_version, baseFile.module_version)
    );
    const isNewFile = !!baseFile;
    const isDeletedFile = file.mark_deleted;
    const isModifiedFile = file.is_modified;

    results.push({
      file,
      baseFile,
      isNewModule,
      isNewFile,
      isDeletedFile,
      isModifiedFile,
      latestBaseFile,
      rebaseRequired
    });
  });

  return results;
}
