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

import { InhibitRule } from "./types";
import { labelNameSchema } from "./common";

export const inhibitRuleSchema: yup.SchemaOf<InhibitRule> = yup
  .object({
    target_match: yup
      .object()
      .meta({
        comment:
          "Matchers that have to be fulfilled in the alerts to be muted.",
        example: "<labelname>: <labelvalue>"
      })
      .notRequired(),
    target_match_re: yup
      .object()
      .meta({
        comment:
          "Regex matchers that have to be fulfilled in the alerts to be muted.",
        example: "<labelname>: <regex>"
      })
      .notRequired(),
    source_match: yup
      .object()
      .meta({
        comment:
          "Matchers for which one or more alerts have to exist for the inhibition to take effect.",
        example: "<labelname>: <labelvalue>"
      })
      .notRequired(),
    source_match_re: yup
      .object()
      .meta({
        comment:
          "Regex matchers for which one or more alerts have to exist for the inhibition to take effect.",
        example: "<labelname>: <regex>"
      })
      .notRequired(),
    equal: yup
      .array()
      .of(labelNameSchema)
      .meta({
        comment:
          "Labels that must have an equal value in the source and target alert for the inhibition to take effect."
      })
      .notRequired()
  })
  .meta({
    url:
      "https://www.prometheus.io/docs/alerting/latest/configuration/#inhibit_rule"
  })
  .noUnknown();
