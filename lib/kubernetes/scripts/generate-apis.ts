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

import {
  certificaterequests,
  certificates,
  challenges,
  clusterIssuers,
  issuers,
  orders,
  clickhouseinstallations,
  clickhouseinstallationtemplates,
  clickhouseoperatorconfigurations,
  cortices,
  jaegers,
  alertmanager,
  podmonitor,
  probe,
  prometheus,
  prometheusrule,
  servicemonitor,
  thanosruler
} from "../src/crds";

import { GenerateCodeForCRD } from "./apigen";

const outDir = `${__dirname}/../src/custom-resources`;

[
  certificaterequests,
  certificates,
  challenges,
  clusterIssuers,
  issuers,
  orders,

  clickhouseinstallations,
  clickhouseinstallationtemplates,
  clickhouseoperatorconfigurations,

  cortices,

  jaegers,

  alertmanager,
  podmonitor,
  probe,
  prometheus,
  prometheusrule,
  servicemonitor,
  thanosruler
].map(async crd => {
  try {
    await GenerateCodeForCRD(crd, outDir);
    console.log(`Successfully generated Resource for: ${crd.spec.names.kind}`);
  } catch (e: any) {
    console.error(
      `\nFailed to generate Resource for: ${crd.spec.names.kind}\n`
    );
    console.error(e);
  }
});
