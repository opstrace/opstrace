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
  Service,
  V1PrometheusResource,
  V1ServicemonitorResource,
  ServiceAccount,
  Role,
  RoleBinding,
  withPodAntiAffinityRequired
} from "@opstrace/kubernetes";
import {
  getNodeCount,
  getTenantNamespace,
  getPrometheusName,
  getDomain
} from "../../../helpers";
import { State } from "../../../reducer";
import { Tenant } from "@opstrace/tenants";
import { select } from "@opstrace/utils";
import { KubeConfig } from "@kubernetes/client-node";

export function PrometheusResources(
  state: State,
  kubeConfig: KubeConfig,
  tenant: Tenant
): ResourceCollection {
  const collection = new ResourceCollection();
  const namespace = getTenantNamespace(tenant);
  const name = getPrometheusName(tenant);

  const config = {
    replicas: select(getNodeCount(state), [
      { "<=": 6, choose: 2 },
      {
        "<=": Infinity,
        choose: 3
      }
    ]),
    diskSize: "10Gi",
    resources: {}
  };

  const serviceMonitorSelector = {
    matchLabels: {
      tenant: tenant.name
    }
  };
  let ruleNamespaceSelector = {};
  let serviceMonitorNamespaceSelector = {};

  // https://github.com/prometheus-community/helm-charts/blob/4ac76c1bd53e92b61fe0e8a99c184b35e471cede/charts/kube-prometheus-stack/values.yaml#L1697
  // "Secrets is a list of Secrets in the same namespace as the
  // Prometheus object, which shall be mounted into the Prometheus
  // Pods.The Secrets are mounted into /etc/prometheus/secrets/""
  let promSecrets: string[] = [];
  let promBearerTokenFile: string | undefined = undefined;

  const remoteWrite: {url: string, bearerTokenFile?: string} = {
    url: `http://cortex-api.${getTenantNamespace(
      tenant
    )}.svc.cluster.local:8080/api/v1/push`
  };

  const remoteRead: {url: string, bearerTokenFile?: string} = {
    url: `http://cortex-api.${getTenantNamespace(
      tenant
    )}.svc.cluster.local:8080/api/v1/read`
  }

  if (tenant.type !== "SYSTEM") {
    ruleNamespaceSelector = serviceMonitorNamespaceSelector = {
      matchLabels: {
        tenant: tenant.name
      }
    };
  } else {
    // For the system tenant's Prometheus -- which scrapes Opstrace system
    // targets and pushes system metrics into Cortex via Prom's remote_write
    // protocol -- use the bearer_token_file mechanism to authenticate POST
    // requests towards the authenticator built into the Cortex API proxy.
    promSecrets = ["system-tenant-api-auth-token"];
    promBearerTokenFile =
      "/etc/prometheus/secrets/system-tenant-api-auth-token/system_tenant_api_auth_token";

    remoteWrite.bearerTokenFile = promBearerTokenFile;
    remoteRead.bearerTokenFile = promBearerTokenFile;
  }

  collection.add(
    new Service(
      {
        apiVersion: "v1",
        kind: "Service",
        metadata: {
          labels: {
            prometheus: name,
            app: "prometheus"
          },
          name: "prometheus",
          namespace
        },
        spec: {
          ports: [
            {
              name: "web",
              port: 9090,
              targetPort: "web" as any
            }
          ],
          selector: {
            app: "prometheus",
            prometheus: name
          },
          sessionAffinity: "ClientIP"
        }
      },
      kubeConfig
    )
  );

  collection.add(
    new V1ServicemonitorResource(
      {
        apiVersion: "monitoring.coreos.com/v1",
        kind: "ServiceMonitor",
        metadata: {
          labels: {
            app: "prometheus",
            prometheus: name,
            tenant: "system"
          },
          name: "prometheus",
          namespace
        },
        spec: {
          jobLabel: "prometheus",
          endpoints: [
            {
              interval: "30s",
              port: "web",
              path: "/prometheus/metrics"
            }
          ],
          selector: {
            matchLabels: {
              app: "prometheus"
            }
          }
        }
      },
      kubeConfig
    )
  );

  collection.add(
    new V1PrometheusResource(
      {
        apiVersion: "monitoring.coreos.com/v1",
        kind: "Prometheus",
        metadata: {
          labels: {
            prometheus: name
          },
          name,
          namespace
        },
        spec: {
          externalUrl: `https://system.${getDomain(state)}/prometheus`,
          routePrefix: "/prometheus",
          affinity: withPodAntiAffinityRequired({
            prometheus: name
          }),
          storage: {
            volumeClaimTemplate: {
              spec: {
                storageClassName: "pd-ssd",
                accessModes: ["ReadWriteOnce"],
                resources: {
                  requests: {
                    storage: config.diskSize
                  }
                }
              }
            }
          },
          alerting: {
            alertmanagers: [
              {
                name: `alertmanager`, // This is the alertmanager svc
                pathPrefix: "/alertmanager",
                namespace,
                port: "web"
              }
            ]
          },
          remoteWrite: [
            remoteWrite
          ],
          remoteRead: [
            remoteRead
          ],
          image: "quay.io/prometheus/prometheus:v2.21.0",
          baseImage: "quay.io/prometheus/prometheus",
          nodeSelector: {
            "kubernetes.io/os": "linux"
          },
          podMonitorSelector: {},
          probeNamespaceSelector: {},
          probeSelector: {},
          replicas: config.replicas,
          resources: config.resources,
          secrets: promSecrets,
          ruleNamespaceSelector,
          ruleSelector: {
            matchLabels: {
              prometheus: name,
              role: "alert-rules"
            }
          },
          securityContext: {
            fsGroup: 2000,
            runAsNonRoot: true,
            runAsUser: 1000
          },
          serviceAccountName: name,
          serviceMonitorNamespaceSelector,
          serviceMonitorSelector,
          version: "v2.21.0"
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
          name,
          namespace
        }
      },
      kubeConfig
    )
  );

  collection.add(
    new Role(
      {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "Role",
        metadata: {
          name,
          namespace
        },
        rules: [
          {
            apiGroups: [""],
            resources: ["services", "endpoints", "pods"],
            verbs: ["get", "list", "watch"]
          }
        ]
      },
      kubeConfig
    )
  );
  collection.add(
    new RoleBinding(
      {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "RoleBinding",
        metadata: {
          name,
          namespace
        },
        roleRef: {
          apiGroup: "rbac.authorization.k8s.io",
          kind: "Role",
          name: name
        },
        subjects: [
          {
            kind: "ServiceAccount",
            name,
            namespace
          }
        ]
      },
      kubeConfig
    )
  );

  return collection;
}
