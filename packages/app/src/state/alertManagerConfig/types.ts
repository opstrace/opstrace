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

// source: https://prometheus.io/docs/alerting/latest/configuration/#duration

export type Duration = string;
export type Labelname = string;
export type Labelvalue = string;
export type Filepath = string;
export type Secret = string;
export type TmplString = string;
export type TmplSecret = string;
export type Int = number;

export enum HttpConfigType {
  None,
  BasicAuth,
  BearerToken,
  BearerTokenFile
}

export interface HttpConfigBasicAuth {
  username: string;
  password?: Secret;
  passwordFile?: string;
}

export interface TlsConfig {
  caFile: Filepath;
  certFile: Filepath;
  keyFile: Filepath;
  serverName: string;
  insecureSkipVerify: Boolean;
}

export interface HttpConfig {
  type: HttpConfigType;
  basicAuth?: HttpConfigBasicAuth;
  bearerToken?: Secret;
  bearerTokenFile?: Filepath;
  tlsConfig?: TlsConfig;
  proxyUrl?: string;
}

export interface Header {
  key: string;
  value: TmplString;
}

export interface Host {
  name: string;
  port: number; // usually is 25, or 587 for SMTP over TLS (sometimes referred to as STARTTLS).
}

export interface GlobalSmtpConfig {
  from: TmplString;
  smartHost: Host;
  hello: string; // default = "localhost"
  authType: SmtpAuthType;
  auth?: SmtpAuth;
  requireTls: Boolean; // default = true
}

export interface EmailConfig extends GlobalSmtpConfig {
  sendResolved: boolean; // default = false
  to: TmplString;
  tlsConfig: TlsConfig;
  html: TmplString; // default = "{{ template "email.default.html" . }}"
  text: TmplString;
  headers: Array<Header>;
}

export enum SmtpAuthType {
  None,
  CramMd5,
  Login,
  Plain
}

export interface SmtpAuth {
  username: string;
  password: Secret;
  identity: string;
  secret: Secret;
}

export interface GlobalSlackConfig {
  apiUrl?: Secret;
}

export interface SlackConfig extends GlobalSlackConfig {
  sendResolved?: boolean; // default = false
  channel: TmplString;
  iconEmoji?: TmplString;
  iconUrl?: TmplString;
  linkNames?: boolean; // default = false
  username?: TmplString; // default = '{{ template "slack.default.username" . }}'
  // actions?: Array<SlackActions>;
  callbackId?: TmplString; // '{{ template "slack.default.callbackid" . }}'
  color?: TmplString; // default = '{{ if eq .Status "firing" }}danger{{ else }}good{{ end }}'
  fallback?: TmplString; // default = '{{ template "slack.default.fallback" . }}'
  // fields?: Array<SlackFieldConfig>;
  footer?: TmplString; // default = '{{ template "slack.default.footer" . }}'
  mrkdwnIn?: Array<string>; // default = ["fallback", "pretext", "text"]
  pretext?: TmplString; // default = '{{ template "slack.default.pretext" . }}'
  shortFields?: boolean; // default = false
  text?: TmplString; // default = '{{ template "slack.default.text" . }}'
  title?: TmplString; // default = '{{ template "slack.default.title" . }}'
  titleLink?: TmplString; // default = '{{ template "slack.default.titlelink" . }}
  imageUrl?: TmplString;
  thumbUrl?: TmplString;
  httpConfig?: HttpConfig; // default GlobalHttpConfig
}

// export interface Victorops {
//   key: Secret;
//   url: string;
// }

// export interface PagerDuty {
//   url: string;
// }

// export interface OpsGenie {
//   key: Secret;
//   url: string;
// }

// export interface Wechat {
//   url: string;
//   secret: Secret;
//   corpId: string;
// }

// export interface Route {}

export interface Receiver {
  name?: string;
  emailConfigs?: Array<EmailConfig>;
  slackConfigs?: Array<SlackConfig>;
}

// export interface InhibitRule {}

export interface GlobalConfig {
  smtpConfig?: GlobalSmtpConfig;
  slack?: GlobalSlackConfig;
  // victorops?: Victorops;
  // pagerduty?: PagerDuty;
  // opsGenie?: OpsGenie;
  // wechat?: Wechat;
  httpConfig?: HttpConfig;
}

export interface AlertManagerConfig {
  global?: GlobalConfig;
  resolveTimeout: Duration;
  // templates?: Array<Filepath>;
  // route?: Route;
  receivers?: Array<Receiver>;
  // inhibitRules?: Array<InhibitRule>;
}

export interface AlertManagerBasicConfig {
  resolveTimeout: Duration;
  slack: {
    sendResolved?: boolean; // default = false
    apiUrl: Secret;
    channel: TmplString;
    text?: TmplString; // default = '{{ template "slack.default.text" . }}'
    title?: TmplString; // default = '{{ template "slack.default.title" . }}'
  };
}
