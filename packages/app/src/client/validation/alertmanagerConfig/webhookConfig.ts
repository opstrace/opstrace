import * as yup from "yup";

import { httpConfig } from "./common";

export const webhookConfig = yup.object({
  send_resolved: yup
    .boolean()
    .default(false)
    .meta({ comment: "Whether or not to notify about resolved alerts." }),
  url: yup.string().meta({
    comment: "The endpoint to send HTTP POST requests to."
  }),
  http_config: httpConfig.meta({
    comment: "The HTTP client's configuration.",
    default: "default = global.http_config"
  }),
  max_alerts: yup.number().integer().positive().default(0).meta({
    comment:
      "The maximum number of alerts to include in a single webhook message. Alerts above this threshold are truncated. When leaving this at its default value of 0, all alerts are included."
  })
});
