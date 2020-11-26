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
