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

import * as glob from "glob";
import * as path from "path";

export function GetGrafanaDashboards(): {
  name: string;
  content: string;
}[] {
  const dashboards: { name: string; content: string }[] = [];

  glob.sync(`${__dirname}/dashboards/**/*.json`).forEach(function (file) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const content = require(path.resolve(file));
    const filename = file.split("/").pop() || "";

    dashboards.push({ name: filename.replace(".json", ""), content });
  });

  return dashboards;
}
