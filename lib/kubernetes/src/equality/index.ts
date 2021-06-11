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

import equal = require("fast-deep-equal");
import { isDeepStrictEqual } from "util";
import * as Service from "./Service";
import * as ServiceMonitor from "./ServiceMonitor";
import * as Pod from "./Pod";
import * as PrometheusRule from "./PrometheusRule";
import * as Prometheus from "./Prometheus";
import * as AlertManager from "./AlertManager";
import {
  DeploymentType,
  StatefulSetType,
  DaemonSetType,
  SecretType,
  ServiceType,
  ConfigMapType,
  ClusterRoleType,
  CustomResourceDefinitionType,
  V1ServicemonitorResourceType,
  V1PrometheusruleResourceType,
  V1PrometheusResourceType,
  V1AlertmanagerResourceType,
  IngressType
} from "..";

import { logDifference } from "./general";
import {
  V1Alpha1CortexResource,
  V1CertificateResource
} from "../custom-resources";
import { isCertificateEqual } from "./Certificate";
import { log } from "@opstrace/utils";

export * from "./general";
export * from "./Pod";

export const hasIngressChanged = (
  desired: IngressType,
  existing: IngressType
): boolean => {
  if (
    !equal(desired.spec.spec, existing.spec.spec) ||
    !equal(
      desired.spec.metadata?.annotations,
      existing.spec.metadata?.annotations
    )
  ) {
    logDifference(
      `${desired.spec.metadata?.namespace}/${desired.spec.metadata?.name}`,
      desired.spec,
      existing.spec
    );
    return true;
  }
  return false;
};

export const hasDeploymentChanged = (
  desired: DeploymentType,
  existing: DeploymentType
): boolean => {
  if (
    desired.spec.spec?.replicas &&
    existing.spec.spec?.replicas &&
    desired.spec.spec.replicas !== existing.spec.spec.replicas
  ) {
    logDifference(
      `${desired.spec.metadata?.namespace}/${desired.spec.metadata?.name}`,
      desired.spec,
      existing.spec
    );
    return true;
  }

  if (
    desired.spec.spec?.strategy !== undefined &&
    !isDeepStrictEqual(
      desired.spec.spec?.strategy,
      existing.spec.spec?.strategy
    )
  ) {
    logDifference(
      `${desired.spec.metadata?.namespace}/${desired.spec.metadata?.name}`,
      desired.spec,
      existing.spec
    );
    return true;
  }

  if (
    desired.spec.spec?.selector !== undefined &&
    !isDeepStrictEqual(
      desired.spec.spec?.selector,
      existing.spec.spec?.selector
    )
  ) {
    logDifference(
      `${desired.spec.metadata?.namespace}/${desired.spec.metadata?.name}`,
      desired.spec,
      existing.spec
    );
    return true;
  }

  if (
    !Pod.isPodSpecTemplateEqual(
      desired.spec.spec?.template,
      existing.spec.spec?.template
    )
  ) {
    logDifference(
      `${desired.spec.metadata?.namespace}/${desired.spec.metadata?.name}`,
      desired.spec,
      existing.spec
    );
    return true;
  }

  return false;
};

export const hasStatefulSetChanged = (
  desired: StatefulSetType,
  existing: StatefulSetType
): boolean => {
  if (
    desired.spec.spec?.replicas &&
    existing.spec.spec?.replicas &&
    desired.spec.spec.replicas !== existing.spec.spec.replicas
  ) {
    logDifference(
      `${desired.spec.metadata?.namespace}/${desired.spec.metadata?.name}`,
      desired.spec,
      existing.spec
    );
    return true;
  }

  if (
    !Pod.isPodSpecTemplateEqual(
      desired.spec.spec?.template,
      existing.spec.spec?.template
    )
  ) {
    logDifference(
      `${desired.spec.metadata?.namespace}/${desired.spec.metadata?.name}`,
      desired.spec,
      existing.spec
    );
    return true;
  }

  return false;
};

export const hasCertificateChanged = (
  desired: V1CertificateResource,
  existing: V1CertificateResource
): boolean => {
  if (!isCertificateEqual(desired.spec, existing.spec)) {
    logDifference(
      `${desired.spec}/${desired.spec}`,
      desired.spec,
      existing.spec
    );
    return true;
  }

  return false;
};

export const hasDaemonSetChanged = (
  desired: DaemonSetType,
  existing: DaemonSetType
): boolean => {
  if (
    !Pod.isPodSpecTemplateEqual(
      desired.spec.spec?.template,
      existing.spec.spec?.template
    )
  ) {
    logDifference(
      `${desired.spec.metadata?.namespace}/${desired.spec.metadata?.name}`,
      desired.spec,
      existing.spec
    );
    return true;
  }

  return false;
};

export const hasSecretChanged = (
  desired: SecretType,
  existing: SecretType
): boolean => {
  if (
    !isDeepStrictEqual(desired.spec.data, existing.spec.data) ||
    !isDeepStrictEqual(desired.spec.stringData, existing.spec.stringData)
  ) {
    logDifference(
      `${desired.spec.metadata?.namespace}/${desired.spec.metadata?.name}`,
      desired.spec,
      existing.spec
    );
    return true;
  }

  return false;
};

export const hasServiceChanged = (
  desired: ServiceType,
  existing: ServiceType
): boolean => {
  if (!Service.isServiceSpecEqual(desired.spec.spec, existing.spec.spec)) {
    logDifference(
      `${desired.spec.metadata?.namespace}/${desired.spec.metadata?.name}`,
      desired.spec,
      existing.spec
    );
    return true;
  }

  return false;
};

export const hasConfigMapChanged = (
  desired: ConfigMapType,
  existing: ConfigMapType
): boolean => {
  if (
    !isDeepStrictEqual(desired.spec.data, existing.spec.data) ||
    !isDeepStrictEqual(desired.spec.binaryData, existing.spec.binaryData)
  ) {
    logDifference(
      `${desired.spec.metadata?.namespace}/${desired.spec.metadata?.name}`,
      desired.spec,
      existing.spec
    );
    return true;
  }

  return false;
};

export const hasServiceMonitorChanged = (
  desired: V1ServicemonitorResourceType,
  existing: V1ServicemonitorResourceType
): boolean => {
  if (!ServiceMonitor.isServiceMonitorEqual(desired.spec, existing.spec)) {
    logDifference(
      `${desired.spec.metadata?.namespace}/${desired.spec.metadata?.name}`,
      desired.spec,
      existing.spec
    );
    return true;
  }

  return false;
};

export const hasPrometheusRuleChanged = (
  desired: V1PrometheusruleResourceType,
  existing: V1PrometheusruleResourceType
): boolean => {
  if (!PrometheusRule.isPrometheusRuleEqual(desired.spec, existing.spec)) {
    logDifference(
      `${desired.spec.metadata?.namespace}/${desired.spec.metadata?.name}`,
      desired.spec,
      existing.spec
    );
    return true;
  }

  return false;
};

export const hasPrometheusChanged = (
  desired: V1PrometheusResourceType,
  existing: V1PrometheusResourceType
): boolean => {
  if (!Prometheus.isPrometheusEqual(desired.spec, existing.spec)) {
    logDifference(
      `${desired.spec.metadata?.namespace}/${desired.spec.metadata?.name}`,
      desired.spec.spec,
      existing.spec.spec
    );
    return true;
  }

  return false;
};

export const hasAlertManagerChanged = (
  desired: V1AlertmanagerResourceType,
  existing: V1AlertmanagerResourceType
): boolean => {
  if (!AlertManager.isAlertManagerEqual(desired.spec, existing.spec)) {
    logDifference(
      `${desired.spec.metadata?.namespace}/${desired.spec.metadata?.name}`,
      desired.spec.spec,
      existing.spec.spec
    );
    return true;
  }

  return false;
};

export const hasClusterRoleChanged = (
  desired: ClusterRoleType,
  existing: ClusterRoleType
): boolean => {
  // The spec in the ClusterRole resource contains the metadata field.
  // Kubernetes adds some fields to the metadata when a resource is created.
  // Those defaults make this check fail. Check if any of the fiels we are
  // interested in have changed.
  if (
    !isDeepStrictEqual(
      desired.spec.aggregationRule,
      existing.spec.aggregationRule
    ) ||
    !isDeepStrictEqual(desired.spec.apiVersion, existing.spec.apiVersion) ||
    !isDeepStrictEqual(desired.spec.kind, existing.spec.kind) ||
    !isDeepStrictEqual(desired.spec.rules, existing.spec.rules) ||
    !isDeepStrictEqual(
      desired.spec.metadata?.annotations,
      existing.spec.metadata?.annotations
    ) ||
    !isDeepStrictEqual(
      desired.spec.metadata?.labels,
      existing.spec.metadata?.labels
    ) ||
    !isDeepStrictEqual(
      desired.spec.metadata?.name,
      existing.spec.metadata?.name
    )
  ) {
    logDifference(
      `${desired.spec.metadata?.namespace}/${desired.spec.metadata?.name}`,
      desired.spec,
      existing.spec
    );
    return true;
  }

  return false;
};

// isDeepStrictEquals doesn't handle the CRD schema very well and always reports
// a mismatch. The workaround is to check if the annotations match. This works
// since we add an annotation with the controller version to the CRDs.
export const hasCustomResourceDefinitionChanged = (
  desired: CustomResourceDefinitionType,
  existing: CustomResourceDefinitionType
): boolean => {
  if (
    !isDeepStrictEqual(
      desired.spec.metadata?.annotations,
      existing.spec.metadata?.annotations
    )
  ) {
    // don't use logDifference because it doesn't handle very large json objects
    // like the CRD schema and it'll stall for a few seconds for each CRD it
    // compares
    log.debug(`CRD ${desired.spec.metadata?.name} requires update`);
    return true;
  }

  return false;
};

export const hasCortexSpecChanged = (
  desired: V1Alpha1CortexResource,
  existing: V1Alpha1CortexResource
): boolean => {
  if (
    !isDeepStrictEqual(
      desired.spec.spec?.alertmanager_spec,
      existing.spec.spec?.alertmanager_spec
    ) ||
    !isDeepStrictEqual(
      desired.spec.spec?.compactor_spec,
      existing.spec.spec?.compactor_spec
    ) ||
    !isDeepStrictEqual(desired.spec.spec?.config, existing.spec.spec?.config) ||
    !isDeepStrictEqual(
      desired.spec.spec?.distributor_spec,
      existing.spec.spec?.distributor_spec
    ) ||
    !isDeepStrictEqual(desired.spec.spec?.image, existing.spec.spec?.image) ||
    !isDeepStrictEqual(
      desired.spec.spec?.ingester_spec,
      existing.spec.spec?.ingester_spec
    ) ||
    !isDeepStrictEqual(
      desired.spec.spec?.memcached,
      existing.spec.spec?.memcached
    ) ||
    !isDeepStrictEqual(
      desired.spec.spec?.querier_spec,
      existing.spec.spec?.querier_spec
    ) ||
    !isDeepStrictEqual(
      desired.spec.spec?.query_frontend_spec,
      existing.spec.spec?.query_frontend_spec
    ) ||
    !isDeepStrictEqual(
      desired.spec.spec?.ruler_spec,
      existing.spec.spec?.ruler_spec
    ) ||
    !isDeepStrictEqual(
      desired.spec.spec?.store_gateway_spec,
      existing.spec.spec?.store_gateway_spec
    )
  ) {
    logDifference("", desired.spec.spec, existing.spec.spec);
    return true;
  }

  return false;
};
