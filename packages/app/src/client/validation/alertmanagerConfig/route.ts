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
    continue: yup.boolean().default(false),
    match: yup.object()
  })
  .nullable()
  .default(null);

// can't use "route" in the definition of route :-)
route = route.shape({ routes: yup.array().of(route) });

export { route };
