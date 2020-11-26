import React, { useCallback, useState } from "react";

import ModuleTreeView from "./ModuleTreeView";
import ModuleTreeViewContainer from "./ModuleTreeViewContainer";

export default {
  title: "Components/ModuleTreeView"
};

export const SingleModule = (): JSX.Element => {
  const [selected, setSelected] = useState("");
  const onSelected = useCallback((id: string) => setSelected(id), []);
  return (
    <ModuleTreeView
      moduleName="test"
      moduleScope="@opstrace"
      selected={selected}
      onSelected={onSelected}
    />
  );
};

export const AllModules = (): JSX.Element => {
  return <ModuleTreeViewContainer />;
};
