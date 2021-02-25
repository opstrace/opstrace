import * as yup from "yup";

import { slackConfig } from "./slackConfig";
import { webhookConfig } from "./webhookConfig";

export const receiver = yup
  .object({
    name: yup.string().required(),
    slack_configs: yup.array().of(slackConfig),
    webhook_configs: yup.array().of(webhookConfig)
  })
  .nullable()
  .default(null);
