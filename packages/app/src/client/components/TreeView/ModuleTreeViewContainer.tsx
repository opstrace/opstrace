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

import React, { useCallback, useState } from "react";
import Skeleton from "@material-ui/lab/Skeleton";
import useModules from "state/module/hooks/useModules";
import ModuleTreeView from "./ModuleTreeView";
import { Box } from "../Box";

const ModuleTreeViewContainer = () => {
  const modules = useModules();

  const [selected, setSelected] = useState("");
  const onSelected = useCallback((id: string) => setSelected(id), []);

  if (modules === null) {
    // no modules
    return null;
  }

  if (modules === undefined) {
    // loading state
    return (
      <>
        {new Array(20).fill(true).map((_, idx) => (
          <Box position="relative" key={idx} height="25px" width="100%" p={0.6}>
            <Skeleton
              variant="rect"
              width="100%"
              height="100%"
              animation="wave"
            />
          </Box>
        ))}
      </>
    );
  }

  return (
    <>
      {modules.map(module => (
        <ModuleTreeView
          key={`${module.branch_name}/${module.scope}/${module.name}`}
          moduleName={module.name}
          moduleScope={module.scope}
          selected={selected}
          onSelected={onSelected}
        />
      ))}
    </>
  );
};

export default React.memo(ModuleTreeViewContainer);
