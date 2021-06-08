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

import { urlJoin } from "url-join-ts";

import {
  ResourceCollection,
  ConfigMap,
  Deployment,
  Service,
  ServiceAccount,
  V1ServicemonitorResource
} from "@opstrace/kubernetes";

import { GetGrafanaDashboards } from "../system/grafanaDashboards";
import { GrafanaDatasourceResources } from "./grafanaDatasources";
import { State } from "../../../reducer";
import { Tenant } from "@opstrace/tenants";
import { getTenantNamespace, getTenantDomain } from "../../../helpers";
import { KubeConfig } from "@kubernetes/client-node";
import { DockerImages } from "@opstrace/controller-config";

export function GrafanaResources(
  state: State,
  kubeConfig: KubeConfig,
  tenant: Tenant
): ResourceCollection {
  const collection = new ResourceCollection();
  const namespace = getTenantNamespace(tenant);

  collection.add(GrafanaDatasourceResources(state, kubeConfig, tenant));

  const volumes: { configMap: { name: string }; name: string }[] = [];
  const volumeMounts: {
    mountPath: string;
    name: string;
    readOnly: boolean;
  }[] = [];
  const grafanaDBName = `grafana_${tenant.name}`;

  // Add our system dashboards.
  if (tenant.type === "SYSTEM") {
    const dashboards = GetGrafanaDashboards();

    volumeMounts.push({
      mountPath: "/etc/grafana/provisioning/dashboards",
      name: "grafana-dashboards",
      readOnly: false
    });

    volumes.push({
      configMap: {
        name: "grafana-dashboards"
      },
      name: "grafana-dashboards"
    });

    dashboards.forEach(d => {
      // Create a ConfigMap for each dashboard
      const name = `grafana-dashboard-${d.name}`;
      collection.add(
        new ConfigMap(
          {
            apiVersion: "v1",
            data: {
              [d.name + ".json"]: JSON.stringify(d.content)
            },
            kind: "ConfigMap",
            metadata: {
              name,
              namespace
            }
          },
          kubeConfig
        )
      );
      volumes.push({
        configMap: {
          name
        },
        name
      });
      volumeMounts.push({
        mountPath: `/grafana-dashboard-definitions/0/${d.name}`,
        name,
        readOnly: false
      });
    });
  }

  collection.add(
    new ConfigMap(
      {
        apiVersion: "v1",
        data: {
          "dashboards.yaml":
            '{"apiVersion": 1,"providers": [{"folder": "","name": "0","options": {"path": "/grafana-dashboard-definitions/0"},"orgId": 1,"type": "file"}]}'
        },
        kind: "ConfigMap",
        metadata: {
          name: "grafana-dashboards",
          namespace
        }
      },
      kubeConfig
    )
  );

  collection.add(
    new ConfigMap(
      {
        apiVersion: "v1",
        data: {
          "grafana.ini":
            "[database]\nurl=" +
            urlJoin(state.config.config?.postgreSQLEndpoint, grafanaDBName)
        },
        kind: "ConfigMap",
        metadata: {
          name: "grafana-config",
          namespace
        }
      },
      kubeConfig
    )
  );

  const dbconfig = new URL(state.config.config?.postgreSQLEndpoint || "");

  collection.add(
    new Deployment(
      {
        apiVersion: "apps/v1",
        kind: "Deployment",
        metadata: {
          labels: {
            app: "grafana"
          },
          name: "grafana",
          namespace
        },
        spec: {
          replicas: 1,
          strategy: {
            type: "Recreate"
          },
          selector: {
            matchLabels: {
              app: "grafana"
            }
          },
          template: {
            metadata: {
              labels: {
                app: "grafana"
              }
            },
            spec: {
              initContainers: [
                {
                  image: DockerImages.postgresClient,
                  name: "creategrafanadb",
                  env: [
                    {
                      name: "PGHOST",
                      value: dbconfig.hostname
                    },
                    {
                      name: "PGUSER",
                      value: dbconfig.username
                    },
                    {
                      name: "PGPASSWORD",
                      value: dbconfig.password
                    }
                  ],
                  command: [
                    "sh",
                    "-c",
                    `echo "SELECT 'CREATE DATABASE ${grafanaDBName}' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${grafanaDBName}')\\gexec" | psql`
                  ]
                }
              ],
              containers: [
                {
                  image: DockerImages.grafana,
                  name: "grafana",
                  ports: [
                    {
                      containerPort: 3000,
                      name: "http"
                    }
                  ],
                  readinessProbe: {
                    httpGet: {
                      path: "/api/health",
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      port: "http" as any,
                      scheme: "HTTP"
                    },
                    timeoutSeconds: 1,
                    periodSeconds: 10,
                    successThreshold: 1,
                    failureThreshold: 3
                  },
                  livenessProbe: {
                    httpGet: {
                      path: "/api/health",
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      port: "http" as any,
                      scheme: "HTTP"
                    },
                    timeoutSeconds: 1,
                    periodSeconds: 10,
                    successThreshold: 1,
                    failureThreshold: 3
                  },
                  resources: {},
                  env: [
                    {
                      name: "GF_USERS_DEFAULT_THEME",
                      value: "light"
                    },
                    {
                      name: "GF_SECURITY_ALLOW_EMBEDDING",
                      value: "true"
                    },
                    {
                      name: "GF_LOG_LEVEL",
                      value: "debug"
                    },
                    {
                      name: "GF_FEATURE_TOGGLES_ENABLE",
                      value: "ngalert"
                    },
                    {
                      name: "GF_SERVER_DOMAIN",
                      value: getTenantDomain(tenant, state)
                    },
                    {
                      name: "GF_SERVER_ROOT_URL",
                      value: `%(protocol)s://%(domain)s/grafana/`
                    },
                    {
                      name: "GF_SERVER_SERVE_FROM_SUB_PATH",
                      value: "true"
                    },
                    {
                      name: "GF_PATHS_PROVISIONING",
                      value: "/etc/grafana/provisioning"
                    },
                    {
                      name: "GF_SECURITY_COOKIE_SECURE",
                      value: "true"
                    },
                    {
                      name: "GF_USERS_ALLOW_ORG_CREATE",
                      value: "false"
                    },
                    {
                      name: "GF_USERS_AUTO_ASSIGN_ORG",
                      value: "true"
                    },
                    {
                      name: "GF_USERS_AUTO_ASSIGN_ORG_ROLE",
                      value: "Editor"
                    },
                    {
                      name: "GF_AUTH_DISABLE_LOGIN_FORM",
                      value: "true"
                    },
                    {
                      name: "GF_AUTH_DISABLE_SIGNOUT_MENU",
                      value: "true"
                    },
                    {
                      name: "GF_AUTH_PROXY_ENABLED",
                      value: "true"
                    },
                    {
                      name: "GF_AUTH_PROXY_HEADER_NAME",
                      value: "x-auth-request-email"
                    },
                    {
                      name: "GF_AUTH_PROXY_HEADER_PROPERTY",
                      value: "email"
                    },
                    {
                      name: "GF_AUTH_PROXY_AUTO_SIGN_UP",
                      value: "true"
                    }
                  ],
                  volumeMounts: [
                    ...[
                      {
                        mountPath: "/etc/grafana/provisioning/datasources",
                        name: "grafana-datasources",
                        readOnly: false
                      },
                      {
                        mountPath: "/etc/grafana/grafana.ini",
                        subPath: "grafana.ini",
                        name: "grafana-config",
                        readOnly: true
                      }
                    ],
                    ...volumeMounts
                  ]
                }
              ],
              nodeSelector: {
                "beta.kubernetes.io/os": "linux"
              },
              securityContext: {
                runAsNonRoot: true,
                runAsUser: 65534,
                fsGroup: 2000
              },
              serviceAccountName: "grafana",
              volumes: [
                ...[
                  {
                    name: "grafana-datasources",
                    secret: {
                      secretName: "grafana-datasources"
                    }
                  },
                  {
                    name: "grafana-config",
                    configMap: {
                      name: "grafana-config"
                    }
                  }
                ],
                ...volumes
              ]
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
          name: "grafana",
          namespace
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
          labels: {
            app: "grafana"
          },
          name: "grafana",
          namespace
        },
        spec: {
          ports: [
            {
              name: "http",
              port: 3000,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: "http" as any
            }
          ],
          selector: {
            app: "grafana"
          }
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
          name: "grafana",
          namespace,
          labels: {
            tenant: "system"
          }
        },
        spec: {
          endpoints: [
            {
              interval: "15s",
              port: "http"
            }
          ],
          selector: {
            matchLabels: {
              app: "grafana"
            }
          }
        }
      },
      kubeConfig
    )
  );

  return collection;
}
