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

export type AlertmanagerConfig = {
  global?: Global;
  templates?: string[];
  route: Route;
  receivers: Receiver[];
  inhibit_rules?: InhibitRule[];
};

export type Global = {
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

export type HttpConfig = {
  basic_auth?: BasicAuth;
  bearer_token?: string;
  bearer_token_file?: string;
  tls_config?: TlsConfig;
  proxy_url?: string;
};

export type BasicAuth = {
  username?: string;
  password?: string;
  password_file?: string;
};

export type TlsConfig = {
  ca_file?: string;
  cert_file?: string;
  key_file?: string;
  server_name?: string;
  insecure_skip_verify?: boolean;
};

export type Route = {
  receiver?: string;
  group_by?: string[];
  continue?: boolean;
  match?: Record<string, string>;
  match_re?: Record<string, string>;
  group_wait?: string;
  group_interval?: string;
  repeat_interval?: string;
};

export type Receiver = {
  name: string;
  email_configs?: EmailConfig[];
  slack_configs?: SlackConfig[];
  pagerduty_configs?: PagerdutyConfig[];
  pushover_configs?: PushoverConfig[];
  opsgenie_configs?: OpsgenieConfig[];
  victorops_configs?: VictorOps[];
  webhook_configs?: WebhookConfig[];
  wechat_configs?: WechatConfig[];
};

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

export type OpsgenieResponderConfig = {
  id?: string;
  name?: string;
  username?: string;
  type: "team" | "user" | "escalation" | "schedule";
};

export type OpsgenieConfig = {
  send_resolved?: boolean;
  api_key?: string;
  api_url?: string;
  message?: string;
  description?: string;
  source?: string;
  details?: Record<string, string>;
  responders: OpsgenieResponderConfig[];
  tags?: string;
  note?: string;
  priority?: string;
  http_config?: HttpConfig;
};

export type PagerdutyImageConfig = {
  href?: string;
  source?: string;
  alt?: string;
};

export type PagerdutyLinkConfig = {
  href?: string;
  text?: string;
};

export type PagerdutyConfig = {
  send_resolved?: boolean;
  routing_key?: string;
  service_key?: string;
  url?: string;
  client?: string;
  client_url?: string;
  description?: string;
  severity?: string;
  details?: Record<string, string>;
  images?: PagerdutyImageConfig[];
  links?: PagerdutyLinkConfig[];
  http_config?: HttpConfig;
};

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

export type SlackConfigActionConfirm = {
  text: string;
  dismiss_text?: string;
  ok_text?: string;
  title?: string;
};

export type SlackConfigAction = {
  text: string;
  type: string;
  url?: string;
  name?: string;
  value?: string;
  confirm?: SlackConfigActionConfirm;
  style?: string;
};

export type SlackConfigField = {
  title: string;
  value: string;
  short?: boolean;
};
export type SlackConfig = {
  send_resolved?: boolean;
  api_url?: string;
  channel: string;
  icon_emoji?: string;
  icon_url?: string;
  link_names?: boolean;
  username?: string;
  actions?: SlackConfigAction[];
  callback_id?: string;
  color?: string;
  fallback?: string;
  fields?: SlackConfigField[];
  footer?: string;
  mrkdwn_in?: string[];
  pretext?: string;
  short_fields?: boolean;
  text?: string;
  title?: string;
  title_link?: string;
  image_url?: string;
  thumb_url?: string;
  http_config?: HttpConfig;
};

export type VictorOps = {
  send_resolved?: boolean;
  api_key?: string;
  api_url?: string;
  routing_key: string;
  message_type?: string;
  entity_display_name?: string;
  state_message?: string;
  monitoring_tool?: string;
  http_config?: HttpConfig;
};

export type WebhookConfig = {
  send_resolved?: boolean;
  url?: string;
  max_alerts?: number;
  http_config?: HttpConfig;
};

export type WechatConfig = {
  send_resolved?: boolean;
  api_secret?: string;
  api_url?: string;
  corp_id?: string;
  message?: string;
  agent_id?: string;
  to_user?: string;
  to_party?: string;
  to_tag?: string;
};

export type InhibitRule = {
  target_match?: Record<string, string>;
  target_match_re?: Record<string, string>;
  source_match?: Record<string, string>;
  source_match_re?: Record<string, string>;
  equal?: string[];
};
