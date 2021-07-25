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
import { parseISO } from "date-fns";
import { GCPConfig } from "@opstrace/gcp";
import { AWSConfig } from "@opstrace/aws";

/**
 * The yup date() schema uses a transformer to parse date strings,
 * like those retrieved from the controller-config's raw value
 * stored in a ConfigMap. This works when not running in strict mode,
 * which turns off transformers. When upgrading the config however,
 * strict validation must be turned on to make sure an old schema that
 * is a strict subset (same but fewer values) of of a new one doesn't
 * coerce to the new schema. Then validation fails. This custom schema
 * permits a string timestamp with ISO format enforced.
 */
const timestampSchema = yup
  .string()
  .test("isISO", "must be an ISO date string", (date: string): boolean => {
    try {
      const p = parseISO(date);
      return !isNaN(p!.getTime());
    } catch {
      return false;
    }
  });

export const ControllerConfigSchemaV3 = yup
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

    custom_dns_name: yup.string().notRequired(),
    custom_auth0_client_id: yup.string().notRequired(),

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
    controllerTerminated: yup.bool().default(false),
    cliMetadata: yup.object({
      allCLIVersions: yup
        .array(
          yup.object({
            version: yup.string(),
            timestamp: timestampSchema
          })
        )
        .ensure()
    })
  })
  .noUnknown()
  .defined();

export type ControllerConfigTypeV3 = yup.InferType<
  typeof ControllerConfigSchemaV3
>;
