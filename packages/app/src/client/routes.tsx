import React from "react";
import { Route, Switch } from "react-router";
import AsyncComponent from "./components/Loadable/AsyncComponent";

const Application = AsyncComponent<{}>(
  /* #__LOADABLE__ */ () =>
    import(/* webpackChunkName: "opstrace-application" */ "./app"),
  false
);

const ModuleRuntime = AsyncComponent<{}>(
  /* #__LOADABLE__ */ () =>
    import(/* webpackChunkName: "opstrace-module-runtime" */ "./runtime")
);

function Routes() {
  return (
    <Switch>
      {/* mount the module runtime under /r/ */}
      <Route key="/r" path="/r" component={ModuleRuntime} />
      {/* everything else falls through to the main Application */}
      <Route key="*" path="*" component={Application} />
    </Switch>
  );
}

export const RoutesWithSSRAssetRemoval = () => {
  // Remove our material-ui styles injected by SSR (we'll leave our styled-components styles)
  React.useEffect(() => {
    const jssStyles = document.querySelector("#jss-server-side");
    if (jssStyles && jssStyles.parentElement) {
      jssStyles.parentElement.removeChild(jssStyles);
    }
  }, []);

  return <Routes />;
};

export default Routes;
