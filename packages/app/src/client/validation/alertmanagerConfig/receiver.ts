import * as yup from "yup";

import { emailConfig } from "./emailConfig";
import { slackConfig } from "./slackConfig";
import { pagerDutyConfig } from "./pagerDutyConfig";
import { pushoverConfig } from "./pushoverConfig";
import { opsgenieConfig } from "./opsgenieConfig";
import { victoropsConfig } from "./victoropsConfig";
import { webhookConfig } from "./webhookConfig";
import { wechatConfig } from "./wechatConfig";

export const receiver = yup
  .object({
    name: yup.string().required(),
    email_configs: yup.array().of(emailConfig),
    slack_configs: yup.array().of(slackConfig),
    pager_duty_configs: yup.array().of(pagerDutyConfig),
    pushover_duty_configs: yup.array().of(pushoverConfig),
    opsgenie_configs: yup.array().of(opsgenieConfig),
    victorops_configs: yup.array().of(victoropsConfig),
    webhook_configs: yup.array().of(webhookConfig),
    wechat_configs: yup.array().of(wechatConfig)
  })
  .nullable()
  .default(null)
  .meta({
    url:
      "https://www.prometheus.io/docs/alerting/latest/configuration/#receiver"
  });
