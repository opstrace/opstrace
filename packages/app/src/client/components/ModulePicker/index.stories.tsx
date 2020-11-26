import React from "react";

import ModulePicker from "./ModulePicker";
import Services from "../../services";

export default {
  title: "Components/ModulePicker"
};

export const Default = (): JSX.Element => {
  return (
    <Services>
      Use ⌘+p (mac) or ⌃+p (linux/windows) to open the module picker
      <ModulePicker />
    </Services>
  );
};
