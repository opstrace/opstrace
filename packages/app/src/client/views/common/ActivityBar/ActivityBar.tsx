/**
 * Copyright 2019-2021 Opstrace, Inc.
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

import React, { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import IconButton from "@material-ui/core/IconButton";
import HelpIcon from "@material-ui/icons/HelpOutline";
import Avatar from "@material-ui/core/Avatar";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import CodeIcon from "@material-ui/icons/Code";
import ChatIcon from "@material-ui/icons/Chat";
import HistoryIcon from "@material-ui/icons/History";
import SettingsIcon from "@material-ui/icons/Settings";
import Box from "client/components/Box/Box";
import { ITheme } from "client/themes";
import Tracy from "../Tracy";
import { useHistory, useLocation } from "react-router-dom";
import { EARLY_PREVIEW } from "client/flags";
import useCurrentUser from "state/user/hooks/useCurrentUser";
import { useCommandService } from "client/services/Command";

export const ActivityBarTabs = EARLY_PREVIEW
  ? ["/module", "/chat", "/history", "/registry", "/cluster"]
  : ["/cluster"];

const getDividerColor = (theme: ITheme) => theme.palette.divider;

const ActivityBarContainer = styled(Box)`
  border-right: 1px solid ${props => getDividerColor(props.theme)};
`;

const AvatarButton = styled(IconButton)`
  padding: 0px;
`;

const HelpButton = styled(IconButton)`
  padding: 0px;

  .MuiSvgIcon-root {
    width: 40px;
    height: 40px;
  }
`;

const avatarStyle = { height: 35, width: 35 };

const ActivityBar = () => {
  const { pathname } = useLocation();
  const [activeTabIndex, setActiveTabIndex] = useState<number | null>(null);
  const history = useHistory();
  const currentUser = useCurrentUser();

  const changeTab = useCallback(
    (index: number) => {
      if (activeTabIndex === null) {
        // This case occurs when we haven't parsed the current url yet to find an active tab.
        // A user would have to be super fast to hit this - very unlikely, but protect against it all the same.
        return;
      }
      const tabRegex = new RegExp(`^${ActivityBarTabs[activeTabIndex]}`);
      history.push({
        ...history.location,
        pathname: history.location.pathname.replace(
          tabRegex,
          ActivityBarTabs[index]
        )
      });
    },
    [history, activeTabIndex]
  );

  const handleChange = (event: React.ChangeEvent<{}>, index: number) => {
    if (index !== activeTabIndex) {
      changeTab(index);
    } else {
      // toggle the sidebar
      cmdService.executeCommand("toggle-sidebar-visibility");
    }
  };

  const navigateToCurrentUser = useCallback(() => {
    history.push(`/cluster/users/${currentUser?.opaque_id}`);
  }, [currentUser, history]);

  useEffect(() => {
    const foundIndex = ActivityBarTabs.findIndex(tab =>
      pathname.startsWith(tab)
    );

    if (foundIndex < 0) {
      changeTab(0);
      return;
    }

    if (foundIndex !== activeTabIndex) {
      setActiveTabIndex(foundIndex);
    }
  }, [activeTabIndex, history, changeTab, pathname]);

  const cmdService = useCommandService();

  return (
    <ActivityBarContainer
      display="flex"
      height="100vh"
      width={50}
      flexDirection="column"
    >
      <Box>
        <Box width={50} height={62} p={1} mb={4}>
          <Tracy />
        </Box>
        <Tabs
          orientation="vertical"
          variant="standard"
          value={
            activeTabIndex === null || activeTabIndex < 0 ? 0 : activeTabIndex
          }
          onChange={handleChange}
          aria-label="activity-bar"
        >
          {EARLY_PREVIEW && <Tab icon={<CodeIcon />} />}
          {EARLY_PREVIEW && <Tab icon={<ChatIcon />} />}
          {EARLY_PREVIEW && <Tab icon={<HistoryIcon />} />}
          <Tab icon={<SettingsIcon />} />
        </Tabs>
      </Box>
      <Box flexGrow={1} display="flex" width={50} alignItems="flex-end">
        <Box>
          <Box width={50} height={50} p={1} mb={1} ml="-3px">
            <HelpButton
              onClick={() => cmdService.executeCommand("open-help-dialog")}
            >
              <HelpIcon color="disabled" />
            </HelpButton>
          </Box>
          <Box width={50} height={62} p={1} mb={2}>
            {currentUser?.avatar ? (
              <AvatarButton onClick={navigateToCurrentUser}>
                <Avatar
                  alt={currentUser?.username}
                  style={avatarStyle}
                  src={currentUser?.avatar}
                />
              </AvatarButton>
            ) : (
              <AvatarButton onClick={navigateToCurrentUser}>
                <Avatar alt={currentUser?.username} style={avatarStyle}>
                  {currentUser?.username.slice(0, 1).toUpperCase()}
                </Avatar>
              </AvatarButton>
            )}
          </Box>
        </Box>
      </Box>
    </ActivityBarContainer>
  );
};

export default ActivityBar;
