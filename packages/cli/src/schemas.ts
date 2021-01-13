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

import { CLUSTER_NAME_REGEX, KNOWN_AWS_REGIONS } from "@opstrace/config";

import { BUILD_INFO } from "./buildinfo";

// Also see issue opstrace-prelaunch/issues/1671.
const CONTROLLER_IMAGE_DEFAULT = `opstrace/controller:${BUILD_INFO.VERSION_STRING}`;

// https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html
// For example, `us-west-2` is the _code_ describing a _region_ in AWS.
// `us-west-2a` encodes availability zone "a" within that region.
export const infraConfigSchemaAWS = yup
  .object({
    instance_type: yup.string().default("t3.xlarge"),
    region: yup.string().oneOf(KNOWN_AWS_REGIONS).default("us-west-2"),
    zone_suffix: yup.string().default("a"),
    eks_admin_roles: yup.array().of(yup.string()).default([])
  })
  .noUnknown(true, err => {
    //@ts-ignore: see opstrace-prelaunch/pull/892 for discussion
    return `unexpected key(s): ${err.unknown}`;
  })
  .defined();

// https://cloud.google.com/compute/docs/regions-zones#available "Regions are
// collections of zones" "The fully-qualified name for a zone is made up of
// <region>-<zone>. For example, the fully qualified name for zone a in region
// us-central1 is us-central1-a."
export const infraConfigSchemaGCP = yup
  .object({
    machine_type: yup.string().default("n1-standard-4"),
    region: yup.string().default("us-west2"),
    zone_suffix: yup.string().default("a")
  })
  .noUnknown(true, err => {
    //@ts-ignore: see opstrace-prelaunch/pull/892 for discussion
    return `unexpected key(s): ${err.unknown}`;
  })
  .defined();

// schema for validating user-given cluster config document.
export const clusterConfigFileSchema = yup
  .object({
    // infra-related things, provider-independent
    node_count: yup.number().positive().integer().required(),

    // Note(JP): CONTROLLER_IMAGE_DEFAULT is supposed to be inserted by
    // CI / the build system (for any build, there is supposed to be a sane
    // default). Also see opstrace-prelaunch/issues/1671
    controller_image: yup.string().default(CONTROLLER_IMAGE_DEFAULT),

    // see opstrace-prelaunch/issues/1676
    tenants: yup
      .array()
      .of(yup.string())
      .min(1, "`tenants` needs to contain at least one tenant name")
      .defined(),

    // note: enforce string properties (lower-case, etc) that are otherwise
    // also enforced by cloud providers (bad values will lead to API errors upon
    // creation, catch that earlier).
    env_label: yup.string(),

    cert_issuer: yup
      .string()
      .oneOf(["letsencrypt-prod", "letsencrypt-staging"])
      .default("letsencrypt-staging"),

    log_retention_days: yup.number().positive().integer().default(7),
    metric_retention_days: yup.number().positive().integer().default(7),

    data_api_authentication_disabled: yup.boolean().default(false),
    data_api_authorized_ip_ranges: yup
      .array()
      .of(yup.string())
      .default(["0.0.0.0/0"]),

    // provider-dependent
    // machine_type: yup.string().default("n1-standard-4"),
    // region: yup.string().default("us-west2"),
    // zone: yup.string().default("a"),

    // requiring 'one of .... keys' is complicated:
    // https://github.com/jquense/yup/issues/248 --  validate this out-of-band,
    // allow both keys to be in the input, any value is allowed.
    aws: yup.object().notRequired(),
    gcp: yup.object().notRequired()
  })
  .noUnknown(true, err => {
    //@ts-ignore: see opstrace-prelaunch/pull/892 for discussion
    return `unexpected key(s): ${err.unknown}`;
  })
  .defined();

// cluster config schema with additional properties merged-in, not contained
// in original user-given cluster config document.
// todo: add installer version? As interesting metadata.
export const renderedClusterConfigSchema = clusterConfigFileSchema.concat(
  yup
    .object()
    .shape({
      cluster_name: yup
        .string()
        .required()
        .matches(CLUSTER_NAME_REGEX)
        .min(2)
        .max(13), // Note(JP): what's our rational here? Reply(Mat): If I remember correctly, this came from the limit
      // imposed for BigTable instance names - they had a strict char limit. This is no longer applicable
      // so we might want to increase the limit.
      cloud_provider: yup
        .mixed<"gcp" | "aws">()
        .oneOf(["aws", "gcp"])
        .required(),
      // can be empty when `disable_data_api_authentication` is true
      // allow empty string, but not undefined:
      // https://stackoverflow.com/a/63944333/145400
      data_api_authn_pubkey_pem: yup.string().typeError().strict(true)
    })
    .noUnknown()
    .defined()
);

export type RenderedClusterConfigSchemaType = yup.InferType<
  typeof renderedClusterConfigSchema
>;
export type ClusterConfigFileSchemaType = yup.InferType<
  typeof clusterConfigFileSchema
>;
