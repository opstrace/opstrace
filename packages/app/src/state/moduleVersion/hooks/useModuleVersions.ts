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
import { useMemo, useEffect } from "react";
import { createSelector } from "reselect";
import semverCompare from "semver/functions/compare";

import { useDispatch, useSelector, State } from "state/provider";
import { subscribe, unsubscribe } from "../actions";
import getSubscriptionID from "state/utils/getSubscriptionID";

import { getCurrentBranch } from "state/branch/hooks/useBranches";
import { sanitizeScope } from "state/utils/sanitize";

const getVersions = (state: State) => state.moduleVersions.versions;

export const makeSortedVersionsForModuleSelector = (
  name: string,
  scope: string
) =>
  createSelector(
    (state: State) => state.moduleVersions.loading,
    getCurrentBranch,
    getVersions,
    (loading, currentBranch, versions) => {
      if (loading) {
        return undefined;
      }
      if (!currentBranch) {
        return currentBranch;
      }
      const latestVersions = versions
        .filter(
          v =>
            v.version === "latest" &&
            v.module_name === name &&
            v.module_scope === scope &&
            (v.branch_name === currentBranch?.name || v.branch_name === "main")
        )
        .sort((a, b) => {
          // push all main branch versions to the end
          if (a.branch_name === "main") {
            return 1;
          }
          if (a.branch_name === b.branch_name) {
            return 0;
          }
          return -1;
        });

      return latestVersions.concat(
        versions
          .filter(v => v.version !== "latest")
          .filter(
            v =>
              v.module_name === name &&
              v.module_scope === scope &&
              (v.branch_name === currentBranch?.name ||
                v.branch_name === "main")
          )
          .sort((a, b) => semverCompare(b.version, a.version))
      );
    }
  );

/**
 * Subscribes to versions for a specific module and will update on
 * any changes. Automatically unsubscribes on unmount.
 */
export function useSortedVersionsForModule(name: string, scope: string) {
  const _scope = sanitizeScope(scope);
  // ensure we only create the selector once for the same inputs
  const versionsSelector = useMemo(
    () => makeSortedVersionsForModuleSelector(name, _scope),
    [name, _scope]
  );
  const moduleVersions = useSelector(versionsSelector);
  const dispatch = useDispatch();

  useEffect(() => {
    const subId = getSubscriptionID();
    dispatch(subscribe(subId));

    return () => {
      dispatch(unsubscribe(subId));
    };
  }, [dispatch]);

  return moduleVersions;
}

/**
 * get latest version of module on main branch
 */
export function useLatestMainVersionForModule(name: string, scope: string) {
  const versions = useSortedVersionsForModule(name, scope);
  if (!versions) {
    return versions;
  }
  // since versions is sorted from latest to oldest, find the first
  // version that is on the main branch
  return versions.find(v => v.branch_name === "main");
}
