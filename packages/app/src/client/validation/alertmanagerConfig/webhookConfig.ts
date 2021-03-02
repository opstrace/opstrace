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

import { httpConfigSchema, HttpConfig } from "./common";

export type WebhookConfig = {
  send_resolved?: boolean;
  url?: string;
  max_alerts?: number;
  http_config?: HttpConfig;
};

export const webhookConfigSchema: yup.SchemaOf<WebhookConfig> = yup
  .object({
    send_resolved: yup.boolean().default(true).meta({
      comment: "Whether or not to notify about resolved alerts."
    }),
    url: yup.string().url().meta({
      comment: "The endpoint to send HTTP POST requests to."
    }),
    max_alerts: yup.number().integer().positive().default(0).meta({
      comment:
        "The maximum number of alerts to include in a single webhook message. Alerts above this threshold are truncated. When leaving this at its default value of 0, all alerts are included."
    }),
    http_config: httpConfigSchema
      .meta({
        comment: "The HTTP client's configuration.",
        default: "default = global.http_config"
      })
      .notRequired()
  })
  .meta({
    urls: [
      "https://www.prometheus.io/docs/alerting/latest/configuration/#webhook_config",
      "https://www.prometheus.io/docs/operating/integrations/#alertmanager-webhook-receiver"
    ]
  })
  .noUnknown();
