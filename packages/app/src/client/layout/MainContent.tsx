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

import React from "react";

import { Box } from "client/components/Box";
import { SplitPane } from "client/components/SplitPane";
import { useCommandService } from "client/services/Command";
import { useDisplayService } from "client/services/Display";

const Layout = (props: {
  children: React.ReactNode;
  sidebar: React.ReactNode;
}) => {
  const display = useDisplayService();

  useCommandService({
    id: "logout",
    description: "Logout",
    handler: () => (window.location.pathname = "/_/auth/logout")
  });

  useCommandService(
    {
      id: "toggle-sidebar-visibility",
      description: display.state.sidebarVisible
        ? "Hide Sidebar"
        : "Show Sidebar",
      keybindings: ["mod+b"],
      category: "View",
      handler: e => {
        e.keyboardEvent?.preventDefault();
        display.setSidebarVisible(!display.state.sidebarVisible);
      }
    },
    [display.state.sidebarVisible]
  );

  return (
    <Box position="relative" display="flex" flexGrow={1}>
      {display.state.sidebarVisible ? (
        <SplitPane
          split="vertical"
          size={display.state.sidebarWidth || 300}
          minSize={100}
          onChangeSize={display.setSidebarWidth}
        >
          {props.sidebar}
          {props.children}
        </SplitPane>
      ) : (
        props.children
      )}
    </Box>
  );
};

export default Layout;
