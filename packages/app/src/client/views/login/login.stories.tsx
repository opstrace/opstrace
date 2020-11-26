import React from "react";
import Services from "../../services";
import Login from ".";

export default {
  title: "Views/Login"
};

export const Default = (): JSX.Element => {
  return (
    <Services>
      <Login />
    </Services>
  );
};
