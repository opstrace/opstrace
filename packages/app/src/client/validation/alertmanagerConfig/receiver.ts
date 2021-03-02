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

import { emailConfigSchema, EmailConfig } from "./emailConfig";
import { slackConfigSchema, SlackConfig } from "./slackConfig";
import { pagerDutyConfigSchema, PagerDutyConfig } from "./pagerDutyConfig";
import { pushoverConfigSchema, PushoverConfig } from "./pushoverConfig";
import { opsgenieConfigSchema, OpsgenieConfig } from "./opsgenieConfig";
import { victoropsConfigSchema, VictorOps } from "./victoropsConfig";
import { webhookConfigSchema, WebhookConfig } from "./webhookConfig";
import { wechatConfigSchema, WechatConfig } from "./wechatConfig";

export type Receiver = {
  name: string;
  email_configs?: EmailConfig[];
  slack_configs?: SlackConfig[];
  pager_duty_configs?: PagerDutyConfig[];
  pushover_duty_configs?: PushoverConfig[];
  opsgenie_configs?: OpsgenieConfig[];
  victorops_configs?: VictorOps[];
  webhook_configs?: WebhookConfig[];
  wechat_configs?: WechatConfig[];
};

export const receiverSchema: yup.SchemaOf<Receiver> = yup
  .object({
    name: yup.string().defined(),
    email_configs: yup.array().of(emailConfigSchema).notRequired(),
    slack_configs: yup.array().of(slackConfigSchema).notRequired(),
    pager_duty_configs: yup.array().of(pagerDutyConfigSchema).notRequired(),
    pushover_duty_configs: yup.array().of(pushoverConfigSchema).notRequired(),
    opsgenie_configs: yup.array().of(opsgenieConfigSchema).notRequired(),
    victorops_configs: yup.array().of(victoropsConfigSchema).notRequired(),
    webhook_configs: yup.array().of(webhookConfigSchema).notRequired(),
    wechat_configs: yup.array().of(wechatConfigSchema).notRequired()
  })
  .meta({
    url:
      "https://www.prometheus.io/docs/alerting/latest/configuration/#receiver"
  })
  .noUnknown();
