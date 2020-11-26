import React from "react";
import { Route, Switch } from "react-router";
import Runtime from "./Runtime";

function Routes() {
  return (
    <Switch>
      <Route key="*" path="*" component={Runtime} />
    </Switch>
  );
}

export default Routes;
