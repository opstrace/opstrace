/**
 * Copyright 2021 Opstrace, Inc.
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

import React from "react";

import { makeStyles, Theme } from "@material-ui/core/styles";
import MuiTabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import { Route, Switch, useLocation } from "react-router";
import { Link } from "react-router-dom";

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    flexGrow: 1,
    borderBottom: `1px solid ${theme.palette.divider}`
  }
}));

export type TabItem = {
  title: string;
  path: string;
  component: React.ComponentType;
};

export type TabsProps = {
  tabs: TabItem[];
};

export function Tabs({ tabs }: TabsProps) {
  const classes = useStyles();
  const location = useLocation();

  return (
    <>
      <MuiTabs
        value={location.pathname}
        indicatorColor="primary"
        variant="scrollable"
        scrollButtons="auto"
        classes={classes}
      >
        {tabs.map(tab => (
          <Tab
            key={tab.title}
            label={tab.title}
            value={tab.path}
            component={Link}
            to={tab.path}
          />
        ))}
      </MuiTabs>
      <Switch>
        {tabs.map(tab => (
          <Route key={tab.path} path={tab.path} component={tab.component} />
        ))}
      </Switch>
    </>
  );
}
