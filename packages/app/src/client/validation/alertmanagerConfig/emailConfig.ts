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

import { tlsConfigSchema, TlsConfig } from "./common";

export type EmailConfig = {
  send_resolved?: boolean;
  to: string;
  from?: string;
  smarthost?: string;
  hello?: string;
  auth_username?: string;
  auth_password?: string;
  auth_secret?: string;
  auth_identity?: string;
  require_tls?: boolean;
  tls_config?: TlsConfig;
  html?: string;
  text?: string;
  headers?: Record<string, string>;
};

export const emailConfigSchema: yup.SchemaOf<EmailConfig> = yup
  .object({
    send_resolved: yup.boolean().default(false).meta({
      comment: "Whether or not to notify about resolved alerts."
    }),
    to: yup.string().defined(),
    from: yup.string().meta({
      comment: "The sender address.",
      default: "default = global.smtp_from"
    }),
    smarthost: yup.string().meta({
      comment:
        "The SMTP host through which email are sent, including port number",
      default: "default = global.smtp_smarthost"
    }),
    hello: yup.string().meta({
      comment: "The hostname to identify to the SMTP server.",
      default: "default = global.smtp_hello"
    }),
    auth_username: yup
      .string()
      .meta({ default: "default = global.smtp_auth_username" }),
    auth_password: yup
      .string()
      .meta({ default: "default = global.smtp_auth_password" }),
    auth_secret: yup
      .string()
      .meta({ default: "default = global.smtp_auth_secret" }),
    auth_identity: yup
      .string()
      .meta({ default: "default = global.smtp_auth_identity" }),
    require_tls: yup.boolean().meta({
      default: "default = global.smtp_require_tls",
      comment:
        "The SMTP TLS requirement. Note that Go does not support unencrypted connections to remote SMTP endpoints."
    }),
    tls_config: tlsConfigSchema.notRequired(),
    html: yup
      .string()
      .default('{{ template "email.default.html" . }}')
      .meta({ comment: "The HTML body of the email notification." }),
    text: yup.string(),
    headers: yup.object().meta({
      comment:
        "Further headers email header key/value pairs. Overrides any headers previously set by the notification implementation.",
      example: "{ <string>: <tmpl_string>, ... }"
    })
  })
  .noUnknown();
