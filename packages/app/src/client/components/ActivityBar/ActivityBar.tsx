/**
 * Copyright 2020 Opstrace, Inc.
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

import React, { useCallback, useEffect } from "react";
import styled from "styled-components";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import ViewModuleIcon from "@material-ui/icons/Apps";
import ChatIcon from "@material-ui/icons/Chat";
import HistoryIcon from "@material-ui/icons/History";
import SyncAltIcon from "@material-ui/icons/SyncAlt";
import Box from "../Box/Box";
import { ITheme } from "client/themes";
import Tracy from "./Tracy";
import { useHistory } from "react-router-dom";

export const ActivityBarTabs = ["/module", "/chat", "/history", "/registry"];

const getDividerColor = (theme: ITheme) => theme.palette.divider;

const TabContainer = styled.div`
  border-right: 1px solid ${props => getDividerColor(props.theme)};
`;

export type ActivityBarProps = {
  activeTab: string;
};

const ActivityBar = ({ activeTab }: ActivityBarProps) => {
  const activeTabIndex = ActivityBarTabs.findIndex(t => t === activeTab);
  const history = useHistory();

  const changeTab = useCallback(
    (index: number) => {
      const tabRegex = new RegExp(`^${activeTab}`);
      // history is mocked in storybook so exit early if it's not the "real" history
      history &&
        history.push &&
        history.push({
          ...history.location,
          pathname: history.location.pathname.replace(
            tabRegex,
            ActivityBarTabs[index]
          )
        });
    },
    [history, activeTab]
  );

  const handleChange = (event: React.ChangeEvent<{}>, index: number) => {
    changeTab(index);
  };

  useEffect(() => {
    if (activeTabIndex < 0) {
      changeTab(0);
    }
  }, [activeTabIndex, history, changeTab]);

  return (
    <Box display="flex" height="100vh" width={50}>
      <TabContainer>
        <Box width={50} height={62} p={1} mb={4}>
          <Tracy />
        </Box>
        <Tabs
          orientation="vertical"
          variant="standard"
          value={activeTabIndex < 0 ? 0 : activeTabIndex}
          onChange={handleChange}
          aria-label="activity-bar"
        >
          <Tab icon={<ViewModuleIcon />} />
          <Tab icon={<ChatIcon />} />
          <Tab icon={<HistoryIcon />} />
          <Tab icon={<SyncAltIcon />} />
        </Tabs>
      </TabContainer>
    </Box>
  );
};

export default ActivityBar;
