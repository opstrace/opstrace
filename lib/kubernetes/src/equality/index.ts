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
  V1ServicemonitorResourceType,
  V1PrometheusruleResourceType,
  V1PrometheusResourceType,
  V1AlertmanagerResourceType,
  IngressType
} from "..";

import { logDifference } from "./general";
import { NetworkingV1beta1IngressTLS } from "@kubernetes/client-node";
import { V1CertificateResource } from "../custom-resources";
import { isCertificateEqual } from "./Certificate";

export * from "./general";
export * from "./Pod";

function isNetworkingV1beta1IngressTLSEqual(
  desired: NetworkingV1beta1IngressTLS,
  existing: NetworkingV1beta1IngressTLS
): boolean {
  return (
    isDeepStrictEqual(desired?.hosts, existing?.hosts) &&
    desired?.secretName == existing?.secretName
  );
}

export const hasIngressChanged = (
  desired: IngressType,
  existing: IngressType
) => {
  if (
    Array.isArray(desired.spec.spec?.tls) &&
    Array.isArray(existing.spec.spec?.tls) &&
    (desired.spec.spec?.tls.length !== existing.spec.spec?.tls.length ||
      desired.spec.spec?.tls.find(
        (t, i) =>
          !isNetworkingV1beta1IngressTLSEqual(t, existing.spec.spec!.tls![i])
      )) &&
    !isDeepStrictEqual(
      desired.spec.metadata!.annotations,
      existing.spec.metadata!.annotations
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
) => {
  if (
    desired.spec.spec!.replicas &&
    existing.spec.spec!.replicas &&
    desired.spec.spec!.replicas !== existing.spec.spec!.replicas
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
      desired.spec.spec!.template,
      existing.spec.spec!.template
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
) => {
  if (
    desired.spec.spec!.replicas &&
    existing.spec.spec!.replicas &&
    desired.spec.spec!.replicas !== existing.spec.spec!.replicas
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
      desired.spec.spec!.template,
      existing.spec.spec!.template
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
) => {
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
) => {
  if (
    !Pod.isPodSpecTemplateEqual(
      desired.spec.spec!.template,
      existing.spec.spec!.template
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

export const hasSecretChanged = (desired: SecretType, existing: SecretType) => {
  // If the secret has this annotation then it means it'll be updated by
  // cert-manager and synchronized by kubed.
  if (
    desired.spec.metadata?.annotations &&
    desired.spec.metadata?.annotations["kubed.appscode.com/sync"] !== undefined
  ) {
    return false;
  }
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
) => {
  if (!Service.isServiceSpecEqual(desired.spec.spec!, existing.spec.spec!)) {
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
) => {
  if (
    !isDeepStrictEqual(desired.spec.data!, existing.spec.data) ||
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
) => {
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
) => {
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
) => {
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
) => {
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
