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
