/**
 * Copyright 2021 Opstrace, Inc.
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

import { AlertManagerBasicConfig } from "./types";

// export const defaultState = (): AlertManagerConfig => ({
//   resolveTimeout: "5m",
//   global: {
//     slack: {
//       apiUrl: "<fancy url>"
//     }
//   },
//   receivers: [
//     {
//       name: "test",
//       slackConfigs: [
//         {
//           channel: "testing",
//           title: "hello world"
//         }
//       ]
//     }
//   ]
// });

export const defaultBasicState = (): AlertManagerBasicConfig => ({
  resolveTimeout: "5m",
  slack: {
    sendResolved: false,
    apiUrl: "",
    channel: ""
    // text: `{{ template "slack.default.text" . }}`,
    // title: `{{ template "slack.default.title" . }}`
  }
});
