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

import React, { useCallback } from "react";
import Skeleton from "@material-ui/lab/Skeleton";

import { Box } from "client/components/Box";
import useBranches, { useCurrentBranch } from "state/branch/hooks/useBranches";
import { Select } from "client/components/Select";
import { useDispatch } from "react-redux";
import { setCurrentBranch } from "state/branch/actions";
import { useHistory } from "react-router-dom";
import { useCommandService } from "client/services/Command";

const BranchSelector = () => {
  const branches = useBranches();
  const currentBranch = useCurrentBranch();
  const dispatch = useDispatch();
  const history = useHistory();

  const createNewBranch = useCallback(() => {
    console.log("calling createBranch");
  }, []);

  useCommandService(
    {
      id: "create-branch",
      description: "Create Branch",
      category: "Module",
      handler: e => {
        e.keyboardEvent?.preventDefault();
        createNewBranch();
      }
    },
    [createNewBranch]
  );

  return (
    <Box width="100%" p={1}>
      {branches === undefined ? (
        <Skeleton variant="rect" width="100%" height={25} />
      ) : (
        <Select
          value={currentBranch?.name}
          name="branch"
          onChange={e => {
            dispatch(setCurrentBranch({ name: e.target.value, history }));
          }}
          inputProps={{ "aria-label": "branch" }}
        >
          {branches.map(b => (
            <option key={b.name} value={b.name}>
              {b.name}
            </option>
          ))}
        </Select>
      )}
    </Box>
  );
};

export default BranchSelector;
