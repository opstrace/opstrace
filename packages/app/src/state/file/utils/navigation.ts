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
import { History } from "history";
import { getFileUri } from "./uri";

export default function navigateToFile(
  file: {
    module_version: string;
    module_scope: string;
    module_name: string;
    branch_name: string;
    path: string;
  },
  history: History,
  overrideWithBranch?: string,
  latest?: boolean
) {
  const parts = history.location.pathname.replace(/^\//, "").split("/");

  const tab = (parts.length && parts.shift()) || "module";

  history.push({
    ...history.location,
    pathname: `/${tab}/${getFileUri(file, {
      branch: overrideWithBranch || file.branch_name,
      useLatest: latest
    })}`
  });
}

const editParam = "edit";

export function isEditMode(history: History) {
  const queryParams = new URLSearchParams(history.location.search);
  return queryParams.has(editParam);
}

export function setEditingMode(history: History, editing: boolean) {
  const queryParams = new URLSearchParams(history.location.search);
  if (editing && queryParams.has(editParam)) {
    return;
  }
  if (!editing && !queryParams.has(editParam)) {
    return;
  }
  if (editing) {
    queryParams.set(editParam, "true");
  } else {
    queryParams.delete(editParam);
  }

  history.push({
    ...history.location,
    search: queryParams.toString()
  });
}
