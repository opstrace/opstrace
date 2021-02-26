import * as yup from "yup";

import { httpConfig } from "./common";

const responderConfig = yup
  .object({
    id: yup.string(),
    name: yup.string(),
    username: yup.string(),
    type: yup
      .string()
      .required()
      .meta({ comment: '"team", "user", "escalation" or schedule".' })
  })
  .meta({ comment: "Exactly one of id, name and username should be defined." });

export const opsgenieConfig = yup.object({
  send_resolved: yup
    .boolean()
    .default(true)
    .meta({ comment: "Whether or not to notify about resolved alerts." }),
  api_key: yup
    .string()
    .default("global.opsgenie_api_key")
    .meta({ comment: "The API key to use when talking to the OpsGenie API." }),
  api_url: yup.string().url().meta({
    comment: "The host to send OpsGenie API requests to.",
    default: "global.opsgenie_api_url"
  }),
  message: yup
    .string()
    .max(130)
    .meta({ comment: "Alert text limited to 130 characters." }),
  description: yup
    .string()
    .default('{{ template "opsgenie.default.description" . }}')
    .meta({ comment: "A description of the incident." }),
  source: yup
    .string()
    .default('{{ template "opsgenie.default.source" . }}')
    .meta({ comment: "" }),
  details: yup.object().nullable().notRequired().meta({
    comment:
      "A set of arbitrary key/value pairs that provide further detail about the incident.",
    example: "<string>: <tmpl_string>"
  }),
  responders: yup
    .array()
    .of(responderConfig)
    .meta({ comment: "List of responders responsible for notifications." }),
  tags: yup.string().meta({
    comment: "Comma separated list of tags attached to the notifications."
  }),
  note: yup.string().meta({ comment: "Additional alert note." }),
  priority: yup.string().meta({
    comment:
      "Priority level of alert. Possible values are P1, P2, P3, P4, and P5."
  }),
  http_config: yup.array().of(httpConfig).meta({
    comment: "The HTTP client's configuration.",
    default: "global.http_config"
  })
});
