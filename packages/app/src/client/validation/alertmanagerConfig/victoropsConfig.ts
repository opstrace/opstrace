import * as yup from "yup";

import { httpConfig } from "./common";

export const victoropsConfig = yup.object({
  send_resolved: yup
    .boolean()
    .default(true)
    .meta({ comment: "Whether or not to notify about resolved alerts." }),
  api_key: yup.string().meta({
    comment: "The API key to use when talking to the VictorOps API.",
    default: "global.victorops_api_key"
  }),
  api_url: yup.string().url().meta({
    comment: "The VictorOps API URL.",
    default: "global.victorops_api_url"
  }),
  routing_key: yup
    .string()
    .required()
    .meta({ comment: "A key used to map the alert to a team." }),
  message_type: yup.string().default("CRITICAL").meta({
    comment: "Describes the behavior of the alert (CRITICAL, WARNING, INFO)."
  }),
  entity_display_name: yup
    .string()
    .default('{{ template "victorops.default.entity_display_name" . }}')
    .meta({ comment: "Contains summary of the alerted problem." }),
  state_message: yup
    .string()
    .default('{{ template "victorops.default.state_message" . }}')
    .meta({ comment: "Contains long explanation of the alerted problem." }),
  monitoring_tool: yup
    .string()
    .default('{{ template "victorops.default.monitoring_tool" . }}')
    .meta({ comment: "The monitoring tool the state message is from." }),
  http_config: yup.array().of(httpConfig).meta({
    comment: "The HTTP client's configuration.",
    default: "global.http_config"
  })
});
