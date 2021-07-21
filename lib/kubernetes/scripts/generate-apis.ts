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

import {
  alertmanager,
  podmonitor,
  prometheus,
  prometheusrule,
  servicemonitor,
  certificaterequests,
  certificates,
  challenges,
  clusterIssuers,
  issuers,
  orders,
  probe,
  thanosruler,
  cortices
} from "../src/crds";

import { GenerateCodeForCRD } from "./apigen";

const outDir = `${__dirname}/../src/custom-resources`;

[
  certificates,
  certificaterequests,
  challenges,
  clusterIssuers,
  issuers,
  orders,
  alertmanager,
  podmonitor,
  prometheus,
  prometheusrule,
  servicemonitor,
  probe,
  thanosruler,
  cortices
].map(async crd => {
  try {
    await GenerateCodeForCRD(crd, outDir);
    console.log(`Successfully generated Resource for: ${crd.spec.names.kind}`);
  } catch (e) {
    console.error(
      `\nFailed to generate Resource for: ${crd.spec.names.kind}\n`
    );
    console.error(e);
  }
});
