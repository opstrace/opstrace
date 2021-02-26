import * as yup from "yup";

import { httpConfig } from "./common";

export const pushoverConfig = yup.object({
  send_resolved: yup
    .boolean()
    .default(true)
    .meta({ comment: "Whether or not to notify about resolved alerts." }),
  user_key: yup
    .string()
    .required()
    .meta({ comment: "The recipient user’s user key." }),
  token: yup.string().required().meta({
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
  url: yup
    .string()
    .default('{{ template "pushover.default.url" . }}')
    .meta({ comment: "A supplementary URL shown alongside the message." }),
  priority: yup
    .string()
    .default('{{ if eq .Status "firing" }}2{{ else }}0{{ end }}')
    .meta({ url: "https://pushover.net/api#priority" }),
  retry: yup
    .string()
    .default("1m")
    .meta({
      comment:
        "How often the Pushover servers will send the same notification to the user. Must be at least 30 seconds."
    }),
  expire: yup
    .string()
    .default("1h")
    .meta({
      comment:
        "How long your notification will continue to be retried for, unless the user acknowledges the notification."
    }),
  http_config: httpConfig.meta({
    comment: "The HTTP client's configuration.",
    default: "global.http_config"
  })
});
