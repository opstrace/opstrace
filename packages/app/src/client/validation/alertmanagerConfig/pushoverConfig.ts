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

export type PushoverConfig = {
  send_resolved?: boolean;
  user_key: string;
  title?: string;
  message?: string;
  url?: string;
  priority?: string;
  retry?: string;
  expire?: string;
  http_config?: HttpConfig;
};

export const pushoverConfigSchema: yup.SchemaOf<PushoverConfig> = yup
  .object({
    send_resolved: yup.boolean().default(true).meta({
      comment: "Whether or not to notify about resolved alerts."
    }),
    user_key: yup
      .string()
      .defined()
      .meta({ comment: "The recipient user’s user key." }),
    token: yup.string().defined().meta({
      comment: "Your registered application’s API token",
      url: "https://pushover.net/apps"
    }),
    title: yup
      .string()
      .default('{{ template "pushover.default.title" . }}')
      .meta({ comment: "Notification title." }),
    message: yup
      .string()
      .default('{{ template "pushover.default.message" . }}')
      .meta({ comment: "Notification message." }),
    url: yup.string().default('{{ template "pushover.default.url" . }}').meta({
      comment: "A supplementary URL shown alongside the message."
    }),
    priority: yup
      .string()
      .default('{{ if eq .Status "firing" }}2{{ else }}0{{ end }}')
      .meta({ url: "https://pushover.net/api#priority" }),
    retry: yup.string().default("1m").meta({
      comment:
        "How often the Pushover servers will send the same notification to the user. Must be at least 30 seconds."
    }),
    expire: yup.string().default("1h").meta({
      comment:
        "How long your notification will continue to be retried for, unless the user acknowledges the notification."
    }),
    http_config: httpConfigSchema
      .meta({
        comment: "The HTTP client's configuration.",
        default: "global.http_config"
      })
      .notRequired()
  })
  .noUnknown();
