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

import React, { useCallback } from "react";
import { useHistory } from "react-router";
import { makeStyles } from "@material-ui/core/styles";
import styled from "styled-components";
import MuiAppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import Button from "@material-ui/core/Button";
import Avatar from "@material-ui/core/Avatar";
import IconButton from "@material-ui/core/IconButton";
import ChevronDown from "@material-ui/icons/ArrowDropDown";

import { Box } from "client/components/Box";
import useCurrentUser from "state/user/hooks/useCurrentUser";

import Tracy from "./Tracy";
import { getKeysFromKeybinding } from "client/services/Command/util";
import { useCommandService, cmdID } from "client/services/Command";
import TenantPicker, {
  openTenantPickerCommandId
} from "client/views/tenants/TenantPicker";
import { useSelectedTenant } from "state/tenant/hooks/useTenant";

export const appBarHeight = 64;

const AvatarButton = styled(IconButton)`
  padding: 0px;
`;

const useStyles = makeStyles(theme => ({
  appBar: {
    height: appBarHeight
  },
  toolbar: {
    height: 60,
    minHeight: 60,
    backgroundColor: "black",
    borderBottom: `1px solid ${theme.palette.divider}`
  },
  avatar: {
    height: 35,
    width: 35,
    border: `2px solid ${theme.palette.divider}`
  },
  tenantButton: {
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2),
    fontSize: "0.875rem",
    "&:hover": {
      background: theme.palette.grey[800]
    }
  }
}));

export default function AppBar() {
  const history = useHistory();
  const currentUser = useCurrentUser();
  const cmdService = useCommandService();
  const classes = useStyles();
  const selectedTenant = useSelectedTenant();

  useCommandService({
    id: "logout",
    description: "Logout",
    handler: () => (window.location.pathname = "/_/auth/logout")
  });

  const navigateToCurrentUser = useCallback(() => {
    history.push(`/cluster/users/${currentUser?.id}`);
  }, [currentUser, history]);

  return (
    <MuiAppBar position="fixed" elevation={0} className={classes.appBar}>
      <Toolbar variant="regular" className={classes.toolbar}>
        <Box width={44} height={54} p={1} ml={-1} mr={-1}>
          <Tracy />
        </Box>
        {selectedTenant && (
          <>
            <Box ml={2} mr={2} width="2px" height="20px" bgcolor="grey.600" />
            <Box ml={1}>
              <Button
                className={classes.tenantButton}
                color="inherit"
                size="small"
                endIcon={<ChevronDown />}
                onClick={() =>
                  cmdService.executeCommand(openTenantPickerCommandId)
                }
              >
                {selectedTenant.name}
              </Button>
            </Box>
          </>
        )}
        <TenantPicker />
        <Box flexGrow={1}></Box>
        <Button
          color="inherit"
          onClick={() => cmdService.executeCommand(cmdID)}
        >
          {getKeysFromKeybinding("mod+k").join(" ")}
        </Button>
        <Box>
          {currentUser?.avatar ? (
            <AvatarButton onClick={navigateToCurrentUser}>
              <Avatar
                alt={currentUser?.username}
                className={classes.avatar}
                src={currentUser?.avatar}
              />
            </AvatarButton>
          ) : (
            <AvatarButton onClick={navigateToCurrentUser}>
              <Avatar alt={currentUser?.username} className={classes.avatar}>
                {currentUser?.username.slice(0, 1).toUpperCase()}
              </Avatar>
            </AvatarButton>
          )}
        </Box>
      </Toolbar>
    </MuiAppBar>
  );
}
