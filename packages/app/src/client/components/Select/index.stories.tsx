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
