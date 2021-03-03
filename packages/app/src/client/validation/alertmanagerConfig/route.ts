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

import { Route } from "./types";
import { labelNameSchema } from "./common";

let routeSchema: yup.SchemaOf<Route> = yup
  .object({
    receiver: yup.string(),
    group_by: yup
      .array()
      .of(labelNameSchema)
      .meta({
        comment: `
The labels by which incoming alerts are grouped together. For example, multiple alerts coming in for cluster=A and alertname=LatencyHigh would be batched into a single group.

To aggregate by all possible labels use the special value '...' as the sole label name, for example: group_by: ['...']

This effectively disables aggregation entirely, passing through all alerts as-is. This is unlikely to be what you want, unless you have a very low alert volume or your upstream notification system performs its own grouping.
  `
      })
      .notRequired(),
    continue: yup.boolean().default(false).meta({
      comment:
        "Whether an alert should continue matching subsequent sibling nodes."
    }),
    match: yup
      .object()
      .meta({
        comment:
          "A set of equality matchers an alert has to fulfill to match the node.",
        example: "<labelname>: <labelvalue>"
      })
      .notRequired(),
    match_re: yup
      .object()
      .meta({
        comment:
          "A set of regex-matchers an alert has to fulfill to match the node.",
        example: "<labelname>: <regex>"
      })
      .notRequired(),
    group_wait: yup.string().default("30s").meta({
      comment:
        "How long to initially wait to send a notification for a group of alerts. Allows to wait for an inhibiting alert to arrive or collect more initial alerts for the same group. (Usually ~0s to few minutes.)"
    }),
    group_interval: yup.string().default("5m").meta({
      comment:
        "How long to wait before sending a notification about new alerts that are added to a group of alerts for which an initial notification has already been sent. (Usually ~5m or more.)"
    }),
    repeat_interval: yup.string().default("4h").meta({
      comment:
        "How long to wait before sending a notification again if it has already been sent successfully for an alert. (Usually ~3h or more)."
    })
  })
  .meta({
    url: "https://www.prometheus.io/docs/alerting/latest/configuration/#route"
  })
  .noUnknown();

// can't use "route" in the definition of route :-)
routeSchema = routeSchema.shape({
  routes: yup
    .array()
    .of(routeSchema)
    .meta({ comment: "Zero or more child routes." })
    .notRequired()
});

export { routeSchema };
