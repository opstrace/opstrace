import * as yup from "yup";

import { labelName } from "./common";

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
    continue: yup.boolean().default(false).meta({
      comment:
        "Whether an alert should continue matching subsequent sibling nodes."
    }),
    match: yup.object().meta({
      comment:
        "A set of equality matchers an alert has to fulfill to match the node.",
      example: "<labelname>: <labelvalue>"
    }),
    match_re: yup.object().meta({
      comment:
        "A set of regex-matchers an alert has to fulfill to match the node.",
      example: "<labelname>: <regex>"
    }),
    group_wait: yup.string().default("30s").meta({
      comment:
        "How long to initially wait to send a notification for a group of alerts. Allows to wait for an inhibiting alert to arrive or collect more initial alerts for the same group. (Usually ~0s to few minutes.)"
    }),
    group_interval: yup
      .string()
      .default("5m")
      .meta({
        comment:
          "How long to wait before sending a notification about new alerts that are added to a group of alerts for which an initial notification has already been sent. (Usually ~5m or more.)"
      }),
    repeat_interval: yup
      .string()
      .default("4h")
      .meta({
        comment:
          "How long to wait before sending a notification again if it has already been sent successfully for an alert. (Usually ~3h or more)."
      })
  })
  .nullable()
  .default(null)
  .meta({
    url: "https://www.prometheus.io/docs/alerting/latest/configuration/#route"
  });

// can't use "route" in the definition of route :-)
route = route.shape({
  routes: yup.array().of(route).meta({ comment: "Zero or more child routes." })
});

export { route };
