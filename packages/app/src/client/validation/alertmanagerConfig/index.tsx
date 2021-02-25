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

import * as yup from "yup";

import { slackConfig } from "./slackConfig";
import { labelName } from "./common";

const global = yup.object({
  slack_api_url: yup.string().url()
});

let route = yup
  .object({
    receiver: yup.string(),
    group_by: yup.array().of(labelName).meta({
      comment: `
The labels by which incoming alerts are grouped together. For example, multiple alerts coming in for cluster=A and alertname=LatencyHigh would be batched into a single group.

To aggregate by all possible labels use the special value '...' as the sole label name, for example: group_by: ['...']

This effectively disables aggregation entirely, passing through all alerts as-is. This is unlikely to be what you want, unless you have a very low alert volume or your upstream notification system performs its own grouping.
  `
    }),
    continue: yup.boolean().default(false),
    match: yup.object()
  })
  .nullable()
  .default(null);

// can't use "route" in the definition of route :-)
route = route.shape({ routes: yup.array().of(route) });

const receiver = yup
  .object({
    name: yup.string().required(),
    slack_configs: yup.array().of(slackConfig)
  })
  .nullable()
  .default(null);

// TODO: NTW - work out what to specify here as:
// "The inferred type of this node exceeds the maximum length the compiler will serialize. An explicit type annotation is needed. ts(7056)"
// eslint-disable-next-line
export const schema = yup.object({
  global: global.required(),
  route: route.required(),
  receivers: yup.array().of(receiver).required()
});
