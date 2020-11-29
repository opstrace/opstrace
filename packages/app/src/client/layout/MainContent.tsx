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
        <SplitPane split="vertical" size={300} minSize={100}>
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
