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

import { Box } from "client/components/Box";
import Typography from "client/components/Typography/Typography";
import RingTable from "./RingTable";
import { Redirect, Route, Switch, useLocation } from "react-router-dom";
import MuiTabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import { Link } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles(theme => ({
  root: {
    flexGrow: 1,
    borderBottom: `1px solid ${theme.palette.divider}`
  }
}));

export const TABS = [
  {
    title: "Ingester",
    path: `/ingester`,
    endpoint: "/_/cortex/ingester/ring"
  },
  {
    title: "Ruler",
    path: `/ruler`,
    endpoint: "/_/cortex/ruler/ring"
  },
  {
    title: "Compactor",
    path: `/compactor`,
    endpoint: "/_/cortex/compactor/ring"
  },
  {
    title: "Store-gateway",
    path: `/store-gateway`,
    endpoint: "/_/cortex/store-gateway/ring"
  }
];

type Props = {
  baseUrl: string;
};

const RingHealth = ({ baseUrl }: Props) => {
  const location = useLocation();
  const classes = useStyles();

  const tabs = TABS.map(tab => ({ ...tab, absolutePath: baseUrl + tab.path }));

  return (
    <>
      <Box pt={1} pb={4}>
        <Typography variant="h1">Ring Health</Typography>
      </Box>

      <MuiTabs
        value={true}
        indicatorColor="primary"
        variant="scrollable"
        scrollButtons="auto"
        classes={classes}
      >
        {tabs.map(tab => (
          <Tab
            value={location.pathname.includes(tab.absolutePath)}
            key={tab.title}
            label={tab.title}
            component={Link}
            to={tab.absolutePath}
          />
        ))}
      </MuiTabs>
      <Switch>
        {tabs.map(tab => (
          <Route key={tab.absolutePath} path={tab.absolutePath}>
            <Box mt={3}>
              <RingTable
                baseUrl={tab.absolutePath}
                ringEndpoint={tab.endpoint}
              />
            </Box>
          </Route>
        ))}
        <Route>
          {/* default to first tab if none is determined by URL */}
          <Redirect to={tabs[0].absolutePath} />;
        </Route>
      </Switch>
    </>
  );
};

export default RingHealth;
