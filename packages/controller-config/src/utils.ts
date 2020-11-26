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

import { ConfigMap, KubeConfiguration } from "@opstrace/kubernetes";
import { ControllerConfigType, controllerConfigSchema } from "./types";

export const CONFIGMAP_NAME = "opstrace-controller-config";
export const STORAGE_KEY = "config.json";

export const isConfigStorage = (configMap: ConfigMap): boolean =>
  configMap.name === CONFIGMAP_NAME;

export const deserialize = (configMap: ConfigMap): ControllerConfigType => {
  return controllerConfigSchema.cast(
    JSON.parse(configMap.spec.data![STORAGE_KEY])
  );
};

export const configmap = (kubeConfig: KubeConfiguration): ConfigMap => {
  return new ConfigMap(
    {
      apiVersion: "v1",
      kind: "ConfigMap",
      metadata: {
        name: CONFIGMAP_NAME
      },
      data: {
        [STORAGE_KEY]: "{}"
      }
    },
    kubeConfig
  );
};

export const serialize = (
  ccfg: ControllerConfigType,
  kubeConfig: KubeConfiguration
): ConfigMap => {
  const cm = new ConfigMap(
    {
      apiVersion: "v1",
      kind: "ConfigMap",
      metadata: {
        name: CONFIGMAP_NAME
      },
      data: {
        [STORAGE_KEY]: JSON.stringify({
          name: ccfg.name,
          infrastructureName: ccfg.infrastructureName,
          target: ccfg.target,
          region: ccfg.region,
          dnsName: ccfg.dnsName,
          tlsCertificateIssuer: ccfg.tlsCertificateIssuer,
          terminate: ccfg.terminate,
          version: ccfg.version,
          mode: ccfg.mode,
          gcpAuthOptions: ccfg.gcpAuthOptions,
          awsAuthOptions: ccfg.awsAuthOptions,
          uiSourceIpFirewallRules: ccfg.uiSourceIpFirewallRules,
          apiSourceIpFirewallRules: ccfg.apiSourceIpFirewallRules,
          apiExternalSourceIpFirewallRules:
            ccfg.apiExternalSourceIpFirewallRules,
          logRetention: ccfg.logRetention,
          metricRetention: ccfg.metricRetention,
          oidcClientId: ccfg.oidcClientId,
          oidcClientSecret: ccfg.oidcClientSecret, // make k8s secret
          authenticationCookie: ccfg.authenticationCookie,
          data_api_authn_pubkey_pem: ccfg.data_api_authn_pubkey_pem,
          disable_data_api_authentication: ccfg.disable_data_api_authentication
        })
      }
    },
    kubeConfig
  );
  cm.setOwnership({ protect: true }); // Protect so the reconciliation loop doesn't destroy it again.

  return cm;
};
