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
  ResourceCollection,
  ServiceAccount,
  ClusterRole,
  ClusterRoleBinding,
  V1ServicemonitorResource,
  Service,
  Deployment,
  withPodAntiAffinityRequired
} from "@opstrace/kubernetes";
import { State } from "../../reducer";
import { Tenant } from "@opstrace/tenants";
import { KubeConfig, V1EnvVar } from "@kubernetes/client-node";
import {
  getNodeCount,
  getControllerConfig,
  getTenantNamespace
} from "../../helpers";
import { addApiIngress } from "./ingress";
import { nodecountToReplicacount } from "./index";
import {
  DockerImages,
  ControllerConfigType
} from "@opstrace/controller-config";

import { keyIDfromPEM, log } from "@opstrace/utils";

// This should really be called "Cortex API"
// also see opstrace-prelaunch/issues/608
// Update: said renaming effort is in progress.

function generateAuthenticatorPubkeySetJSON(data_api_authn_pubkey_pem: string) {
  // The key set is required to be a mapping between keyID (string) and
  // PEM-encoded pubkey (string).
  // Note: upon _continutation_, this key should be added to the existing
  // key set.
  const keyId = keyIDfromPEM(data_api_authn_pubkey_pem);
  const keyset = {
    [keyId]: data_api_authn_pubkey_pem
  };

  log.info("built authenticator key ID: %s", keyId);

  // The corresponding configuration parameter value is expected to be a
  // string, namely the above `keyset` mapping in JSON-encoded form *without
  // literal newline chars*.
  const tenant_api_authenticator_pubkey_set_json = JSON.stringify(keyset);
  log.info(
    "generated AuthenticatorPubkeySetJSON: %s",
    tenant_api_authenticator_pubkey_set_json
  );
  return tenant_api_authenticator_pubkey_set_json;
}

export function CortexAPIResources(
  state: State,
  tenant: Tenant,
  kubeConfig: KubeConfig
): ResourceCollection {
  const collection = new ResourceCollection();

  const { tlsCertificateIssuer } = getControllerConfig(state);

  const config = {
    replicas: nodecountToReplicacount(getNodeCount(state)),
    resources: {}
  };

  const controllerConfig: ControllerConfigType = getControllerConfig(state);

  const namespace = getTenantNamespace(tenant);

  // This was 'prometheus' before, see epic opstrace-prelaunch/issues/1609
  const api = "cortex";
  const name = `${api}-api`;
  const cortexQuerierUrl = "http://query-frontend.cortex.svc.cluster.local";
  const cortexDistributorUrl = "http://distributor.cortex.svc.cluster.local";

  const cortexApiProxyCliArgs = [
    "-listen=:8080",
    `-tenantname=${tenant.name}`,
    // Upstream endpoints for the opstrace cortex proxy
    `-cortex-querier-url=${cortexQuerierUrl}`,
    `-cortex-distributor-url=${cortexDistributorUrl}`
  ];

  let cortexApiProxyEnv: V1EnvVar[];
  cortexApiProxyEnv = [];

  if (controllerConfig.disable_data_api_authentication) {
    cortexApiProxyCliArgs.push("-disable-api-authn");
  }

  // Support legacy controller config schema, with only
  // `data_api_authn_pubkey_pem` being set.
  if (controllerConfig.data_api_authn_pubkey_pem !== undefined) {
    const pubkeypem: string = controllerConfig.data_api_authn_pubkey_pem as string;
    if (pubkeypem.length > 0) {
      log.info(
        "found legacy controller config with data_api_authn_pubkey_pem parameter"
      );
      const keySetJSON = generateAuthenticatorPubkeySetJSON(pubkeypem);
      cortexApiProxyEnv = [
        {
          name: "API_AUTHTOKEN_VERIFICATION_PUBKEY_SET",
          value: keySetJSON
        }
      ];
    }
  } else {
    // code path for new controller config schema, with
    // `tenant_api_authenticator_pubkey_set_json` being set and
    // data_api_authn_pubkey_pem not being set.
    cortexApiProxyEnv = [
      {
        name: "API_AUTHTOKEN_VERIFICATION_PUBKEY_SET",
        value: controllerConfig.tenant_api_authenticator_pubkey_set_json
      }
    ];
  }

  collection.add(
    new Deployment(
      {
        apiVersion: "apps/v1",
        kind: "Deployment",
        metadata: {
          name: name,
          namespace,
          labels: {
            "k8s-app": name
          }
        },
        spec: {
          replicas: config.replicas,
          selector: {
            matchLabels: {
              "k8s-app": name
            }
          },
          template: {
            metadata: {
              labels: {
                "k8s-app": name
              }
            },
            spec: {
              affinity: withPodAntiAffinityRequired({
                "k8s-app": name
              }),
              containers: [
                {
                  name: "cortex-api",
                  image: DockerImages.cortexApiProxy,
                  imagePullPolicy: "Always",
                  args: cortexApiProxyCliArgs,
                  ports: [
                    {
                      name: "http",
                      protocol: "TCP",
                      containerPort: 8080
                    }
                  ],
                  readinessProbe: {
                    httpGet: {
                      path: "/metrics",
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      port: 8080 as any,
                      scheme: "HTTP"
                    },
                    timeoutSeconds: 1,
                    periodSeconds: 10,
                    successThreshold: 1,
                    failureThreshold: 3
                  },
                  livenessProbe: {
                    httpGet: {
                      path: "/metrics",
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      port: 8080 as any,
                      scheme: "HTTP"
                    },
                    timeoutSeconds: 1,
                    periodSeconds: 10,
                    successThreshold: 1,
                    failureThreshold: 3
                  },
                  resources: config.resources,
                  env: cortexApiProxyEnv
                }
              ],
              serviceAccountName: name
            }
          }
        }
      },
      kubeConfig
    )
  );

  collection.add(
    new Service(
      {
        apiVersion: "v1",
        kind: "Service",
        metadata: {
          name,
          labels: {
            "k8s-app": name,
            job: `${namespace}.cortex-api`
          },
          namespace
        },
        spec: {
          ports: [
            {
              name: "http",
              port: 8080,
              protocol: "TCP",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: 8080 as any
            }
          ],
          selector: {
            "k8s-app": name
          }
        }
      },
      kubeConfig
    )
  );

  addApiIngress({
    serviceName: name,
    issuer: tlsCertificateIssuer,
    namespace,
    tenant,
    api,
    state,
    collection,
    kubeConfig
  });

  collection.add(
    new V1ServicemonitorResource(
      {
        apiVersion: "monitoring.coreos.com/v1",
        kind: "ServiceMonitor",
        metadata: {
          labels: {
            "k8s-app": name,
            tenant: "system"
          },
          name,
          namespace
        },
        spec: {
          endpoints: [
            {
              interval: "30s",
              path: "/metrics",
              port: "http"
            }
          ],
          jobLabel: "job",
          namespaceSelector: {
            matchNames: [namespace]
          },
          selector: {
            matchLabels: {
              "k8s-app": name
            }
          }
        }
      },
      kubeConfig
    )
  );

  collection.add(
    new ServiceAccount(
      {
        apiVersion: "v1",
        kind: "ServiceAccount",
        metadata: {
          name: name,
          namespace
        }
      },
      kubeConfig
    )
  );

  collection.add(
    new ClusterRole(
      {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "ClusterRole",
        metadata: {
          name: name
        },
        rules: [
          {
            apiGroups: [""],
            resources: ["namespaces", "pods"],
            verbs: ["get", "list", "watch"]
          }
        ]
      },
      kubeConfig
    )
  );

  collection.add(
    new ClusterRoleBinding(
      {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "ClusterRoleBinding",
        metadata: {
          name: name
        },
        roleRef: {
          apiGroup: "rbac.authorization.k8s.io",
          kind: "ClusterRole",
          name: name
        },
        subjects: [
          {
            kind: "ServiceAccount",
            name: name,
            namespace
          }
        ]
      },
      kubeConfig
    )
  );

  return collection;
}
