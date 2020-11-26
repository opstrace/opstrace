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

const getCurrentBranchName = (state: State) => state.branches.currentBranchName;

export const getBranches = createSelector(
  (state: State) => state.branches.branches,
  branches => branches
);

export const getCurrentBranch = createSelector(
  (state: State) => state.branches.loading,
  (state: State) => state.branches.branches,
  (state: State) => state.branches.currentBranchName,
  (loading, branches, currentBranchName) => {
    if (loading) {
      return undefined;
    }
    const branch = branches.find(b => b.name === currentBranchName);

    return branch || null;
  }
);

export function useCurrentBranchName() {
  return useSelector(getCurrentBranchName);
}

export function useCurrentBranch() {
  const currentBranch = useSelector(getCurrentBranch);
  const dispatch = useDispatch();

  useEffect(() => {
    const subId = getSubscriptionID();
    dispatch(subscribe(subId));

    return () => {
      dispatch(unsubscribe(subId));
    };
  }, [dispatch]);

  return currentBranch;
}

/**
 * Subscribes to branches and will update on
 * any changes. Automatically unsubscribes
 * on unmount.
 */
export default function useBranches() {
  const branches = useSelector(getBranches);
  const dispatch = useDispatch();

  useEffect(() => {
    const subId = getSubscriptionID();
    dispatch(subscribe(subId));

    return () => {
      dispatch(unsubscribe(subId));
    };
  }, [dispatch]);

  return branches;
}
