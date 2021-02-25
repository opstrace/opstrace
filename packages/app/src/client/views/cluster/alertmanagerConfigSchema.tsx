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

import { subdomainValidator } from "client/utils/regex";

const global = yup.object({
  slack_api_url: yup.string().url()
});

const tlsConfig = yup
  .object({
    ca_file: yup.string().meta({
      comment: "CA certificate to validate the server certificate with."
    }),
    cert_file: yup.string().meta({
      comment: "CA certificate to validate the server certificate with."
    }),
    key_file: yup.string().meta({
      comment:
        "Certificate and key files for client cert authentication to the server."
    }),
    server_name: yup
      .string()
      .matches(subdomainValidator, { excludeEmptyString: true })
      .meta({
        comment: "ServerName extension to indicate the name of the server.",
        url: "http://tools.ietf.org/html/rfc4366#section-3.1"
      }),
    insecure_skip_verify: yup.boolean().default(false)
  })
  .nullable()
  .default(null);

const httpConfig = yup
  .object({
    basic_auth: yup
      .object()
      .when(["bearer_token", "bearer_token_file"], {
        is: (bearer_token: string | null, bearer_token_file: string | null) =>
          bearer_token || bearer_token_file,
        then: yup.object().notRequired().nullable(),
        otherwise: yup.object().required()
      })
      .shape({
        username: yup.string(),
        password: yup.string().when("password_file", {
          is: (password_file: string | null) => password_file,
          then: yup.object().notRequired().nullable(),
          otherwise: yup.object().required()
        }),
        password_file: yup.string().when("password", {
          is: (password: string | null) => password,
          then: yup.object().notRequired().nullable(),
          otherwise: yup.object().required()
        })
      })
      .nullable()
      .default(null)
      .meta({
        comment:
          "Sets the `Authorization` header with the configured username and password."
      }),
    bearer_token: yup
      .string()
      .when(["basic_auth", "bearer_token_file"], {
        is: (basic_auth: object | null, bearer_token_file: string | null) =>
          basic_auth || bearer_token_file,
        then: yup.string().notRequired().nullable(),
        otherwise: yup.string().required()
      })
      .meta({
        comment:
          "Sets the `Authorization` header with the configured bearer token."
      }),
    bearer_token_file: yup
      .string()
      .when(["basic_auth", "bearer_token"], {
        is: (basic_auth: object | null, bearer_token: string | null) =>
          basic_auth || bearer_token,
        then: yup.string().notRequired().nullable(),
        otherwise: yup.string().required()
      })
      .meta({
        comment:
          "Sets the `Authorization` header with the bearer token read from the configured file."
      }),
    tls_config: tlsConfig,
    proxy_url: yup.string()
  })
  .nullable()
  .default(null);

const slackConfigAction = yup.object({
  text: yup.string().required(),
  type: yup.string().required(),
  url: yup.string().when(["name", "value"], {
    is: (name: string | null, value: string | null) => name || value,
    then: yup.string().notRequired().nullable(),
    otherwise: yup.string().url().required()
  }),
  name: yup.string().when(["url"], {
    is: (url: string | null) => url,
    then: yup.string().notRequired().nullable(),
    otherwise: yup.string().required()
  }),
  value: yup.string().when(["url"], {
    is: (url: string | null) => url,
    then: yup.string().notRequired().nullable(),
    otherwise: yup.string().required()
  }),
  confirm: yup
    .object({
      text: yup.string().required(),
      dismiss_text: yup.string().default(""),
      ok_text: yup.string().default(""),
      title: yup.string().default("")
    })
    .nullable()
    .default(null),
  style: yup.string().default("")
});

const slackConfig = yup
  .object({
    send_resolved: yup
      .boolean()
      .meta({ comment: "Whether or not to notify about resolved alerts." }),
    api_url: yup.string().meta({
      comment: "The Slack webhook URL.",
      default: "default = global.slack_api_url"
    }),
    channel: yup
      .string()
      .required()
      .meta({ comment: "The channel or user to send notifications to." }),
    icon_emoji: yup.string(),
    icon_url: yup.string(),
    link_names: yup.boolean().default(false),
    username: yup.string().default('{{ template "slack.default.username" . }}'),
    actions: yup.array().of(slackConfigAction),
    callback_id: yup
      .string()
      .default('{{ template "slack.default.callbackid" . }}'),
    color: yup
      .string()
      .default('{{ if eq .Status "firing" }}danger{{ else }}good{{ end }}'),
    fallback: yup.string().default('{{ template "slack.default.fallback" . }}'),
    fields: yup.array().of(
      yup
        .object({
          title: yup.string().required(),
          value: yup.string().required(),
          short: yup
            .boolean()
            .meta({ default: "default = slack_config.short_fields" })
        })
        .nullable()
        .default(null)
    ),
    footer: yup.string().default('{{ template "slack.default.footer" . }}'),
    mrkdwn_in: yup
      .array()
      .of(yup.string())
      .default(["fallback", "pretext", "text"]),
    pretext: yup.string().default('{{ template "slack.default.pretext" . }}'),
    short_fields: yup.boolean().default(false),
    text: yup.string().default('{{ template "slack.default.text" . }}'),
    title: yup.string().default('{{ template "slack.default.title" . }}'),
    title_link: yup
      .string()
      .default('{{ template "slack.default.titlelink" . }}'),
    image_url: yup.string(),
    thumb_url: yup.string(),
    http_config: httpConfig.meta({
      comment: "The HTTP client's configuration.",
      default: "default = global.http_config"
    })
  })
  .nullable()
  .default(null);

const labelName = yup.string().matches(/[a-zA-Z_][a-zA-Z0-9_]*/);

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
route = route.shape({ routes: yup.array().of(route).required() });

const receiver = yup
  .object({
    name: yup.string().required(),
    slack_configs: yup.array().of(slackConfig)
  })
  .nullable()
  .default(null);

// TODO: NTW - work out what to specify here as:
// "The inferred type of this node exceeds the maximum length the compiler will serialize. An explicit type annotation is needed. ts(7056)"
// eslint-disable-next-line
export const schema = yup.object({
  global: global.required(),
  routes: yup.array().of(route).required(),
  receivers: yup.array().of(receiver).required()
});
