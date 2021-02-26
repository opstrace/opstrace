import * as yup from "yup";

import { emailConfig } from "./emailConfig";
import { slackConfig } from "./slackConfig";
import { pagerDutyConfig } from "./pagerDutyConfig";
import { pushoverConfig } from "./pushoverConfig";
import { webhookConfig } from "./webhookConfig";

export const receiver = yup
  .object({
    name: yup.string().required(),
    email_configs: yup.array().of(emailConfig),
    slack_configs: yup.array().of(slackConfig),
    pager_duty_configs: yup.array().of(pagerDutyConfig),
    pushover_duty_configs: yup.array().of(pushoverConfig),
    webhook_configs: yup.array().of(webhookConfig)
  })
  .nullable()
  .default(null)
  .meta({
    url:
      "https://www.prometheus.io/docs/alerting/latest/configuration/#receiver"
  });
