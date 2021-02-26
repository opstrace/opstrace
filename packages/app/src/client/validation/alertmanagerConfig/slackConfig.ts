import * as yup from "yup";

import { httpConfig } from "./common";

const slackConfigAction = yup.object({
  text: yup.string().required(),
  type: yup.string().required(),
  url: yup.string(),
  name: yup.string(),
  value: yup.string(),
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

export const slackConfig = yup
  .object({
    send_resolved: yup
      .boolean()
      .default(false)
      .meta({ comment: "Whether or not to notify about resolved alerts." }),
    api_url: yup.string().url().meta({
      comment: "The Slack webhook URL.",
      default: "global.slack_api_url"
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
          short: yup.boolean().meta({ default: "slack_config.short_fields" })
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
      default: "global.http_config"
    })
  })
  .nullable()
  .default(null);
