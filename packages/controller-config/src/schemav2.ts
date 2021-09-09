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

export const ControllerConfigSchemaV2 = yup
  .object({
    name: yup.string(),
    target: yup
      .mixed<"gcp" | "aws">()
      .oneOf(["gcp", "aws"])
      .required("must specify a target (gcp | aws)"),
    region: yup.string().required("must specify region"),
    logRetentionDays: yup
      .number()
      .required("must specify log retention in number of days"),
    metricRetentionDays: yup
      .number()
      .required("must specify metric retention in number of days"),
    dnsName: yup.string().required(),

    // Added later to V2, but is an optional parameter, therefore not strictly
    // justifying a new schema version. Content and name need to be iterated on.
    custom_dns_name: yup.string().notRequired(),
    custom_auth0_client_id: yup.string().notRequired(),
    custom_auth0_domain: yup.string().notRequired(),

    terminate: yup.bool().default(false),
    // https://stackoverflow.com/a/63944333/145400 `data_api_authn_pubkey_pem`
    // is optional, is a legacy controller config option, a noop right now
    // (future: set fallback key for authenticator).
    data_api_authn_pubkey_pem: yup.string().optional(),
    tenant_api_authenticator_pubkey_set_json: yup
      .string()
      .typeError()
      .strict(true),
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

export type ControllerConfigTypeV2 = yup.InferType<
  typeof ControllerConfigSchemaV2
>;
