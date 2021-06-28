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

import React, { useState } from "react";
import { NavLink, useRouteMatch } from "react-router-dom";
import { ChevronDown, ChevronRight } from "react-feather";
import className from "classnames";

import { appBarHeight } from "./AppBar";

import { makeStyles, useTheme } from "@material-ui/core/styles";
import List from "@material-ui/core/List";
import Hidden from "@material-ui/core/Hidden";
import Paper from "@material-ui/core/Paper";
import Divider from "@material-ui/core/Divider";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import Collapse from "@material-ui/core/Collapse";
import { ExternalLink } from "client/components/Link";
import { Box } from "client/components/Box";
import { Typography } from "client/components/Typography";

export const sidebarWidth = 250;
export const minimizedSidebarWidth = 70;

export type NavItem = {
  icon?: React.ReactElement;
  title: string;
  path: string;
  nestedItems?: NavItem[];
};

export type SidebarProps = {
  tenantNavItems: NavItem[];
  clusterNavItems: NavItem[];
};

const useStyles = makeStyles(theme => ({
  paper: {
    borderRadius: 0,
    borderTop: "none",
    borderBottom: "none",
    borderLeft: "none",
    height: "100%"
  },
  nested: {
    paddingLeft: theme.spacing(6)
  },
  listItem: {
    cursor: "pointer",
    paddingTop: 0,
    paddingBottom: 0,
    height: 36,
    color: theme.palette.text.primary
  },
  listIcon: {
    minWidth: 24,
    marginRight: 8,
    flexShrink: 0,
    color: "inherit"
  },
  navLink: {
    textDecoration: "none"
  },
  nestedListItemText: {
    fontSize: "0.8125rem"
  },
  activeItem: {
    color: theme.palette.primary.main
  }
}));

const NavItemContents = ({
  item,
  nested,
  narrow,
  onClick,
  children,
  testKey
}: {
  item: NavItem;
  narrow: boolean;
  nested?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
  testKey?: string;
}) => {
  const classes = useStyles();
  const routeMatch = useRouteMatch(item.path);
  console.log(testKey);

  return (
    <ListItem
      dense
      onClick={onClick}
      data-test={testKey}
      className={className({
        [classes.activeItem]: routeMatch,
        [classes.listItem]: true,
        [classes.nested]: nested
      })}
    >
      {!nested && (
        <ListItemIcon className={classes.listIcon}>
          {item.icon && React.cloneElement(item.icon, { width: "18px" })}
        </ListItemIcon>
      )}
      {nested ? (
        <ListItemText
          hidden={narrow}
          secondary={item.title}
          secondaryTypographyProps={{
            className: className({
              [classes.nestedListItemText]: true,
              [classes.activeItem]: routeMatch
            })
          }}
        />
      ) : (
        <ListItemText hidden={narrow} primary={item.title} />
      )}
      {!narrow && children}
    </ListItem>
  );
};

const NavItemLink = (
  item: NavItem,
  narrow: boolean,
  testKey: string = "sidebar"
) => {
  const routeMatch = useRouteMatch(item.path);
  const [collapsed, setCollapsed] = useState(!routeMatch);
  const theme = useTheme();
  const classes = useStyles();

  if (item.nestedItems) {
    return (
      <React.Fragment key={item.title}>
        <NavItemContents
          narrow={narrow}
          item={item}
          testKey={`${testKey}/${item.title}`}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight size={14} color={theme.palette.text.secondary} />
          ) : (
            <ChevronDown size={14} color={theme.palette.text.secondary} />
          )}
        </NavItemContents>

        <Collapse in={!collapsed && !narrow} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {item.nestedItems.map(nestedItem => {
              return (
                <NavLink
                  className={classes.navLink}
                  to={nestedItem.path}
                  key={nestedItem.title}
                  title={nestedItem.title}
                >
                  <NavItemContents
                    narrow={narrow}
                    item={nestedItem}
                    nested
                    testKey={`${testKey}/${item.title}/${nestedItem.title}`}
                  />
                </NavLink>
              );
            })}
          </List>
        </Collapse>
      </React.Fragment>
    );
  }

  return (
    <NavLink
      className={classes.navLink}
      to={item.path}
      key={item.title}
      title={item.title}
    >
      <NavItemContents
        narrow={narrow}
        item={item}
        testKey={`${testKey}/${item.title}`}
      />
    </NavLink>
  );
};

const Sidebar = ({ tenantNavItems, clusterNavItems }: SidebarProps) => {
  const classes = useStyles();
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const content = (narrow: boolean) => (
    <Box
      display="flex"
      width={sidebarWidth}
      flexDirection="column"
      height={`calc(100% - ${appBarHeight}px)`}
      overflow="hidden"
    >
      <Box p={1}>
        <List>
          {tenantNavItems.map(item =>
            NavItemLink(item, narrow, "sidebar/tenant")
          )}
        </List>
      </Box>
      <Divider />
      <Box p={1}>
        <Box minHeight={36} p={1} ml={1} pl={5}>
          <Typography variant="h6" hidden={narrow} color="textSecondary">
            Cluster Admin
          </Typography>
        </Box>
        <List>
          {clusterNavItems.map(item =>
            NavItemLink(item, narrow, "sidebar/clusterAdmin")
          )}
        </List>
      </Box>
      <Box flexGrow={1} />
      <Box m={2} p={2}>
        <Typography align="center" gutterBottom variant="body2">
          <ExternalLink target="_blank" href="https://opstrace.com/docs">
            View docs
          </ExternalLink>
        </Typography>
        <Typography align="center" variant="body2">
          <ExternalLink
            target="_blank"
            href="https://github.com/opstrace/opstrace/issues/new/choose"
          >
            Submit an issue
          </ExternalLink>
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box position="fixed" height="100%" zIndex={1000}>
      <Hidden mdDown>
        <Paper
          variant="outlined"
          className={classes.paper}
          style={{
            width: sidebarWidth
          }}
        >
          {content(false)}
        </Paper>
      </Hidden>
      <Hidden lgUp>
        <Paper
          variant="outlined"
          onClick={() => setMobileExpanded(true)}
          onMouseEnter={() => setMobileExpanded(true)}
          onMouseLeave={() => setMobileExpanded(false)}
          className={classes.paper}
          style={{
            overflowX: "hidden",
            transition: "width 200ms",
            width: mobileExpanded ? sidebarWidth : minimizedSidebarWidth
          }}
        >
          {content(!mobileExpanded)}
        </Paper>
      </Hidden>
    </Box>
  );
};

export default Sidebar;
