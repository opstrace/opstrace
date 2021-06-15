/**
 * Copyright 2020 Opstrace, Inc.
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

import { call, delay, select, CallEffect } from "redux-saga/effects";
import * as yaml from "js-yaml";

import { log, SECOND, httpcl } from "@opstrace/utils";
import { State } from "../reducer";
import { getDomain } from "../helpers";
import getRules from "../system/rules";
import getAlerts from "../system/alerts";

export function* cortexSystemRulesReconciler(): Generator<
  CallEffect,
  unknown,
  unknown
> {
  return yield call(function* () {
    const state: State = yield select();
    const domain = getDomain(state);

    const runbookUrl =
      "https://github.com/opstrace/opstrace/blob/master/docs/alerts";
    const grafanaArgs = "?orgId=1&refresh=10s&from=now-30m&to=now";
    const grafanaUrl =
      `https://system.${domain}/grafana/d/bF4hjRpZk/opstrace-system` +
      grafanaArgs;

    const rules = getRules();
    const alerts = getAlerts(runbookUrl, grafanaUrl);

    while (true) {
      try {
        // Apply rules to system tenant
        yield httpcl(
          `http://ruler.cortex.svc.cluster.local/api/v1/rules/system`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/yaml",
              "X-Scope-OrgID": "system"
            },
            body: yaml.safeDump(rules)
          }
        );
      } catch (err) {
        log.error("failed applying system rules: %s", err);
      }

      try {
        // Apply alerts to system tenant
        yield httpcl(
          `http://ruler.cortex.svc.cluster.local/api/v1/alerts/system`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/yaml",
              "X-Scope-OrgID": "system"
            },
            body: yaml.safeDump(alerts)
          }
        );
      } catch (err) {
        log.error("failed applying system alerts: %s", err);
      }
      // loop through again in 1 min
      yield delay(60 * SECOND);
    }
  });
}
