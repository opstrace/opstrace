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

import React, { ReactNode } from "react";

import { Box } from "client/components/Box";
import Typography from "client/components/Typography/Typography";
import { Redirect, Route, Switch, useLocation } from "react-router-dom";
import MuiTabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import { Link } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";

import RingTable from "./RingTable";

const useStyles = makeStyles(theme => ({
  root: {
    flexGrow: 1,
    borderBottom: `1px solid ${theme.palette.divider}`
  }
}));

type Tab = {
  title: string;
  path: string;
  endpoint: string;
};

type Props = {
  title: ReactNode;
  tabs: Array<Tab>;
};

const RingHealth = ({ tabs, title }: Props) => {
  const location = useLocation();
  const classes = useStyles();

  return (
    <div>
      <Box pt={1} pb={4}>
        <Typography variant="h1">{title}</Typography>
      </Box>
      <Switch>
        {tabs.map(tab => (
          <Route key={tab.path} path={tab.path}>
            <MuiTabs
              value={true}
              indicatorColor="primary"
              variant="scrollable"
              scrollButtons="auto"
              classes={classes}
            >
              {tabs.map(tab => (
                <Tab
                  value={location.pathname.includes(tab.path)}
                  key={tab.title}
                  label={tab.title}
                  component={Link}
                  to={tab.path}
                />
              ))}
            </MuiTabs>
            <Box mt={3}>
              <RingTable baseUrl={tab.path} ringEndpoint={tab.endpoint} />
            </Box>
          </Route>
        ))}
        <Route>
          {/* default to first tab if none is determined by URL */}
          <Redirect to={tabs[0].path} />;
        </Route>
      </Switch>
    </div>
  );
};

export default RingHealth;
