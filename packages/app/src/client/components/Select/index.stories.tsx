import React, { useState } from "react";

import Select from "./Select";

export default {
  title: "Components/Select"
};

export const Default = (): JSX.Element => {
  const [value, setValue] = useState("2.0.0");
  return (
    <div style={{ width: "100%", padding: 60 }}>
      <Select
        value={value}
        name="version"
        onChange={e => setValue(e.target.value)}
        inputProps={{ "aria-label": "version" }}
      >
        <option value="2.0.0">2.0.0</option>
        <option value="1.9.0">1.9.0</option>
        <option value="1.8.4">1.8.4</option>
      </Select>
    </div>
  );
};
