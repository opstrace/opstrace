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
import { useEffect } from "react";
import { createSelector } from "reselect";
import { useDispatch, useSelector, State } from "state/provider";
import { subscribe, unsubscribe } from "../actions";
import getSubscriptionID from "state/utils/getSubscriptionID";
import { sanitizeScope } from "state/utils/sanitize";
import { getCurrentBranch } from "state/branch/hooks/useBranches";

export const getModules = (state: State) => state.modules.modules;

export const getCurrentBranchModules = createSelector(
  (state: State) => state.modules.loading,
  getCurrentBranch,
  getModules,
  (loading, currentBranch, modules) => {
    if (currentBranch === null) {
      return null;
    }
    if (loading || !currentBranch) {
      return undefined;
    }

    return modules.filter(m => m.branch_name === currentBranch.name);
  }
);

export const getMainBranchModules = createSelector(getModules, modules =>
  modules.filter(m => m.branch_name === "main")
);

/**
 * returns all modules in current branch + modules in main branch
 * that don't already exist in the current branch
 */
export const getCombinedModules = createSelector(
  getCurrentBranch,
  getCurrentBranchModules,
  getMainBranchModules,
  (currentBranch, currentBranchModules, mainBranchModules) => {
    if (currentBranch === null || currentBranchModules === null) {
      return null;
    }
    if (currentBranchModules === undefined) {
      return undefined;
    }
    if (currentBranch?.name === "main") {
      return mainBranchModules;
    }
    return currentBranchModules.concat(
      mainBranchModules.filter(
        m =>
          !currentBranchModules.find(
            cm => cm.name === m.name && cm.scope === m.scope
          )
      )
    );
  }
);

export const getMainBranchModule = (name: string, scope: string) =>
  createSelector(getMainBranchModules, modules =>
    modules.find(m => m.name === name && m.scope === scope)
  );

export const getCurrentBranchModule = (name: string, scope: string) =>
  createSelector(getCurrentBranchModules, modules =>
    modules?.find(m => m.name === name && m.scope === scope)
  );

/**
 * Subscribes to modules and will update on
 * any changes. Automatically unsubscribes
 * on unmount.
 */
export default function useModules() {
  const modules = useSelector(getCombinedModules);
  const dispatch = useDispatch();

  useEffect(() => {
    const subId = getSubscriptionID();
    dispatch(subscribe(subId));

    return () => {
      dispatch(unsubscribe(subId));
    };
  }, [dispatch]);

  if (modules === null) {
    return null;
  }
  if (modules === undefined) {
    return undefined;
  }

  return modules.sort((a, b) =>
    `@${sanitizeScope(b.scope)}/${b.name}` >
    `@${sanitizeScope(a.scope)}/${a.name}`
      ? -1
      : 1
  );
}
