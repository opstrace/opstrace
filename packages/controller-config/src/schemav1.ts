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

import * as yup from "yup";
import { GCPConfig } from "@opstrace/gcp";
import { AWSConfig } from "@opstrace/aws";

export const ControllerConfigSchemaV1 = yup
  .object({
    name: yup.string(),
    target: yup
      .mixed<"gcp" | "aws">()
      .oneOf(["gcp", "aws"])
      .required("must specify a target (gcp | aws)"),
    region: yup.string().required("must specify region"),
    logRetention: yup
      .number()
      .required("must specify log retention in number of days"),
    metricRetention: yup
      .number()
      .required("must specify metric retention in number of days"),
    dnsName: yup.string().required(),
    terminate: yup.bool().default(false),
    data_api_authn_pubkey_pem: yup.string().required(), // assume: non-empty string
    disable_data_api_authentication: yup.bool().required(),
    uiSourceIpFirewallRules: yup.array(yup.string()).ensure(),
    apiSourceIpFirewallRules: yup.array(yup.string()).ensure(),
    postgreSQLEndpoint: yup.string().notRequired(),
    opstraceDBName: yup.string().notRequired(),
    envLabel: yup.string(),
    // Note: remove one of cert_issuer and `tlsCertificateIssuer`.
    cert_issuer: yup
      .string()
      .oneOf(["letsencrypt-prod", "letsencrypt-staging"])
      .required(),
    tlsCertificateIssuer: yup
      .mixed<"letsencrypt-staging" | "letsencrypt-prod">()
      .oneOf(["letsencrypt-staging", "letsencrypt-prod"])
      .required(),
    infrastructureName: yup.string().required(),
    aws: yup.mixed<AWSConfig | undefined>(),
    gcp: yup.mixed<GCPConfig | undefined>(),
    controllerTerminated: yup.bool().default(false)
  })
  .noUnknown()
  .defined();

export type ControllerConfigTypeV1 = yup.InferType<
  typeof ControllerConfigSchemaV1
>;
