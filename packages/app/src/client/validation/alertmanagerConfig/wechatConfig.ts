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

export const wechatConfig = yup.object({
  send_resolved: yup
    .boolean()
    .default(false)
    .meta({ comment: "Whether or not to notify about resolved alerts." }),
  api_secret: yup
    .string()
    .default("global.wechat_api_secret")
    .meta({ commit: "The API key to use when talking to the WeChat API." }),
  api_url: yup
    .string()
    .url()
    .default("global.wechat_api_url")
    .meta({ commit: "The WeChat API URL." }),
  corp_id: yup
    .string()
    .default("global.wechat_api_corp_id")
    .meta({ commit: "The corp id for authentication." }),
  message: yup.string().default('{{ template "wechat.default.message" . }}'),
  agent_id: yup.string().default('{{ template "wechat.default.agent_id" . }}'),
  to_user: yup.string().default('{{ template "wechat.default.to_user" . }}'),
  to_party: yup.string().default('{{ template "wechat.default.to_party" . }}'),
  to_tag: yup.string().default('{{ template "wechat.default.to_tag" . }}')
});
