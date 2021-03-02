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
import { routeSchema, Route } from "./route";
import { receiverSchema, Receiver } from "./receiver";
import { inhibitRuleSchema, InhibitRule } from "./inhibitRule";

type Global = {
  smtp_from?: string;
  smtp_smarthost?: string;
  smtp_hello?: string;
  smtp_auth_username?: string;
  smtp_auth_password?: string;
  smtp_auth_identity?: string;
  smtp_auth_secret?: string;
  smtp_require_tls?: boolean;
  slack_api_url?: string;
  victorops_api_key?: string;
  victorops_api_url?: string;
  pagerduty_url?: string;
  opsgenie_api_key?: string;
  opsgenie_api_url?: string;
  wechat_api_url?: string;
  wechat_api_secret?: string;
  wechat_api_corp_id?: string;
  http_config?: HttpConfig;
  resolve_timeout?: string;
};

const globalSchema: yup.SchemaOf<Global> = yup
  .object({
    smtp_from: yup
      .string()
      .meta({ comment: "The default SMTP From header field." }),
    smtp_smarthost: yup.string().meta({
      comment:
        "The default SMTP smarthost used for sending emails, including port number. Port number usually is 25, or 587 for SMTP over TLS (sometimes referred to as STARTTLS).",
      example: "smtp.example.org:587"
    }),
    smtp_hello: yup.string().default("localhost").meta({
      comment: "The default hostname to identify to the SMTP server."
    }),
    smtp_auth_username: yup.string().meta({
      comment:
        "SMTP Auth using CRAM-MD5, LOGIN and PLAIN. If empty, Alertmanager doesn't authenticate to the SMTP server."
    }),
    smtp_auth_password: yup
      .string()
      .meta({ comment: "SMTP Auth using LOGIN and PLAIN." }),
    smtp_auth_identity: yup
      .string()
      .meta({ comment: "SMTP Auth using PLAIN." }),
    smtp_auth_secret: yup
      .string()
      .meta({ comment: "SMTP Auth using CRAM-MD5." }),
    smtp_require_tls: yup.boolean().default(true).meta({
      comment:
        "The SMTP TLS requirement. Note that Go does not support unencrypted connections to remote SMTP endpoints."
    }),

    slack_api_url: yup.string().url(),
    victorops_api_key: yup.string(),
    victorops_api_url: yup
      .string()
      .url()
      .default(
        "https://alert.victorops.com/integrations/generic/20131114/alert/"
      ),
    pagerduty_url: yup
      .string()
      .url()
      .default("https://events.pagerduty.com/v2/enqueue"),
    opsgenie_api_key: yup.string(),
    opsgenie_api_url: yup.string().url().default("https://api.opsgenie.com/"),
    wechat_api_url: yup
      .string()
      .url()
      .default("https://qyapi.weixin.qq.com/cgi-bin/"),
    wechat_api_secret: yup.string(),
    wechat_api_corp_id: yup.string(),

    http_config: httpConfigSchema
      .meta({
        comment: "The default HTTP client configuration"
      })
      .notRequired(),

    resolve_timeout: yup.string().default("5m").meta({
      comment:
        "ResolveTimeout is the default value used by alertmanager if the alert does not include EndsAt, after this time passes it can declare the alert as resolved if it has not been updated. This has no impact on alerts from Prometheus, as they always include EndsAt."
    })
  })
  .noUnknown();

type AlertmanagerConfig = {
  global?: Global;
  templates?: string[];
  route: Route;
  receivers: Receiver[];
  inhibitRules?: InhibitRule[];
};

export const alertManagerConfigSchema: yup.SchemaOf<AlertmanagerConfig> = yup
  .object({
    global: globalSchema.notRequired(),
    templates: yup
      .array()
      .of(yup.string())
      .meta({
        comment:
          "Files from which custom notification template definitions are read. # The last component may use a wildcard matcher, e.g. 'templates/*.tmpl'."
      })
      .notRequired(),
    route: routeSchema
      .defined()
      .meta({ comment: "The root node of the routing tree." }),
    // @ts-ignore
    receivers: yup.array().of(receiverSchema).defined(),
    inhibitRules: yup.array().of(inhibitRuleSchema).notRequired()
  })
  .meta({
    url: "https://www.prometheus.io/docs/alerting/latest/configuration/"
  })
  .noUnknown();
