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

import { OpsgenieResponderConfig, OpsgenieConfig } from "./types";
import { httpConfigSchema } from "./common";

const opsgenieResponderConfig: yup.SchemaOf<OpsgenieResponderConfig> = yup
  .object({
    id: yup.string(),
    name: yup.string(),
    username: yup.string(),
    type: yup
      .mixed()
      .oneOf(["team", "user", "escalation", "schedule"])
      .defined()
  })
  .meta({
    comment: "Exactly one of id, name and username should be defined."
  })
  .noUnknown();

export const opsgenieConfigSchema: yup.SchemaOf<OpsgenieConfig> = yup
  .object({
    send_resolved: yup.boolean().default(true).meta({
      comment: "Whether or not to notify about resolved alerts."
    }),
    api_key: yup.string().default("global.opsgenie_api_key").meta({
      comment: "The API key to use when talking to the OpsGenie API."
    }),
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
    details: yup
      .object()
      .meta({
        comment:
          "A set of arbitrary key/value pairs that provide further detail about the incident.",
        example: "<string>: <tmpl_string>"
      })
      .notRequired(),
    responders: yup
      .array()
      .of(opsgenieResponderConfig)
      .meta({
        comment: "List of responders responsible for notifications."
      })
      .notRequired(),
    tags: yup.string().meta({
      comment: "Comma separated list of tags attached to the notifications."
    }),
    note: yup.string().meta({ comment: "Additional alert note." }),
    priority: yup.string().meta({
      comment:
        "Priority level of alert. Possible values are P1, P2, P3, P4, and P5."
    }),
    http_config: httpConfigSchema
      .meta({
        comment: "The HTTP client's configuration.",
        default: "global.http_config"
      })
      .notRequired()
  })
  .noUnknown();
