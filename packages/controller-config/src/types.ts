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
import { gcpAuthOptionsSchema, GCPAuthOptions } from "@opstrace/gcp";
import { AWSConfig } from "@opstrace/aws";

export const controllerConfigSchema = yup
  .object({
    name: yup
      .string()
      .required("Must provide a name")
      .matches(
        /^[A-Za-z0-9-]+$/,
        "must only contain alphanumeric characters and -"
      ),
    target: yup
      .mixed<"gcp" | "aws">()
      .oneOf(["gcp", "aws"])
      .required("must specify a target (gcp | aws)"),
    version: yup.string().required("must specify a version"),
    region: yup.string().required("must specify region"),
    logRetention: yup.number().required("must specify log retention"),
    metricRetention: yup.number().required("must specify metric retention"),
    dnsName: yup.string().required(),
    terminate: yup.bool().default(false),
    // https://stackoverflow.com/a/63944333/145400
    data_api_authn_pubkey_pem: yup.string().typeError().strict(true),
    disable_data_api_authentication: yup.bool().required(),
    uiSourceIpFirewallRules: yup.array(yup.string()).ensure(),
    apiSourceIpFirewallRules: yup.array(yup.string()).ensure(),
    apiExternalSourceIpFirewallRules: yup.array(yup.string()).ensure(),
    oidcClientId: yup.string().required(),
    oidcClientSecret: yup.string().required(),
    authenticationCookie: yup
      .string()
      .required(
        "[internal] must specify authenticationCookie for oauth2_proxy to use"
      ),

    cert_issuer: yup
      .string()
      .oneOf(["letsencrypt-prod", "letsencrypt-staging"])
      .required(),

    tlsCertificateIssuer: yup
      .mixed<"letsencrypt-staging" | "letsencrypt-prod">()
      .oneOf(["letsencrypt-staging", "letsencrypt-prod"])
      .required(
        "[internal] must specify tlsCertificateIssuer (letsencrypt-staging or letsencrypt-prod)"
      ),
    infrastructureName: yup
      .string()
      .required(
        "[internal] used to track the name for cloud infrastructure components. Should be the output of `getInfrastructureName(stackName)`"
      )
      .min(1)
      .max(
        30,
        "must be less than 30 characters to be reliably used for cloud infrastructure naming (bigtable has a 30 char limit)"
      ),

    mode: yup
      .mixed<"development" | "production">()
      .oneOf(["development", "production"])
      .required("[internal] must specify mode (development | production)"),

    gcpAuthOptions: yup
      .mixed<GCPAuthOptions | undefined>()
      .when(["target", "dnsProvider"], {
        // if target or dnsProvider is gcp, then make this required, otherwise it's not required
        is: (target: string, dnsProvider: string) =>
          target === "gcp" || dnsProvider === "gcp",
        then: () =>
          gcpAuthOptionsSchema.required(
            "[internal] must specify gcpAuthOptions"
          ),
        otherwise: () => yup.mixed().strip(true)
      }),
    // AWS configuration
    aws: yup.mixed<AWSConfig | undefined>(),

    controllerTerminated: yup.bool().default(false)
  })
  .noUnknown()
  .defined();

export type ControllerConfigType = yup.InferType<typeof controllerConfigSchema>;
