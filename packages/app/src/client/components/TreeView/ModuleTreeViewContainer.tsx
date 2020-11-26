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
          key={`${module.scope}/${module.name}`}
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
