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
import axios from "axios";

import { log, SECOND } from "@opstrace/utils";
import { State } from "../reducer";
import { getDomain } from "../helpers";
import getRules from "../system/rules";
import getAlerts from "../system/alerts";

// Make this optional, so that running the controller locally during dev
// doesn't require a connection to the service.
const rulerEndpoint = process.env.RULER_ENDPOINT ?? "";

export function* cortexSystemRulesReconciler(): Generator<
  CallEffect,
  unknown,
  unknown
> {
  return yield call(function* () {
    if (rulerEndpoint === "") {
      log.info(
        "disabled system alert rules reconciliation: ruler endpoint not configured"
      );
      return;
    }

    const state: State = yield select();
    const domain = getDomain(state);

    // TODO this could reference the SHA of the controller build
    const runbookUrl =
      "https://github.com/opstrace/opstrace/blob/main/docs/alerts";
    const grafanaArgs = "?orgId=1&refresh=10s&from=now-30m&to=now";
    const grafanaUrl =
      `https://system.${domain}/grafana/d/bF4hjRpZk/opstrace-system` +
      grafanaArgs;

    const rules = getRules();
    const alerts = getAlerts(runbookUrl, grafanaUrl);

    while (true) {
      try {
        // Apply rules to system tenant
        yield Promise.all(
          [...rules, ...alerts].map(group =>
            axios({
              url: `${rulerEndpoint}/system`,
              method: "POST",
              headers: {
                "Content-Type": "application/yaml",
                "X-Scope-OrgID": "system"
              },
              timeout: 30 * SECOND,
              data: yaml.safeDump(group)
            })
          )
        );
      } catch (err) {
        log.error("failed applying system rules/alerts: %s", err);
      }
      // loop through again in 1 min
      yield delay(60 * SECOND);
    }
  });
}
