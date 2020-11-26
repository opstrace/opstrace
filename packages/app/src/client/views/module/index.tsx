import React from "react";

import ModuleLayout from "client/views/common/ModuleLayout";

import SideBar from "./Sidebar";

const Module = () => {
  return <ModuleLayout sidebar={SideBar} />;
};

export default Module;
