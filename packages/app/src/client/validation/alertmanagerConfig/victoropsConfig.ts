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

import { VictorOps } from "./types";
import { httpConfigSchema } from "./common";

export const victoropsConfigSchema: yup.SchemaOf<VictorOps> = yup
  .object({
    send_resolved: yup.boolean().default(true).meta({
      comment: "Whether or not to notify about resolved alerts."
    }),
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
      .defined()
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
      .meta({
        comment: "Contains long explanation of the alerted problem."
      }),
    monitoring_tool: yup
      .string()
      .default('{{ template "victorops.default.monitoring_tool" . }}')
      .meta({
        comment: "The monitoring tool the state message is from."
      }),
    http_config: httpConfigSchema
      .meta({
        comment: "The HTTP client's configuration.",
        default: "global.http_config"
      })
      .notRequired()
  })
  .noUnknown();
