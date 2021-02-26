import * as yup from "yup";

import { tlsConfig } from "./common";

export const emailConfig = yup.object({
  send_resolved: yup
    .boolean()
    .default(false)
    .meta({ comment: "Whether or not to notify about resolved alerts." }),
  to: yup.string().required(),
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
  tls_config: tlsConfig,
  html: yup
    .string()
    .default('{{ template "email.default.html" . }}')
    .meta({ comment: "The HTML body of the email notification." }),
  text: yup.string(),
  headers: yup.object().nullable().notRequired().meta({
    comment:
      "Further headers email header key/value pairs. Overrides any headers previously set by the notification implementation.",
    example: "{ <string>: <tmpl_string>, ... }"
  })
});
