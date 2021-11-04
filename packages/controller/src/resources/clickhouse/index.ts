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

import { KubeConfig } from "@kubernetes/client-node";
import {
  Namespace,
  ResourceCollection,
  V1ClickhouseinstallationResource,
  V1ServicemonitorResource
} from "@opstrace/kubernetes";
import { DockerImages } from "@opstrace/controller-config";

// Note: Changing this requires also changing the "opstrace_controller" keys below.
export const CLICKHOUSE_USERNAME = "opstrace_controller";
export const CLICKHOUSE_PASSWORD = "opstrace_controller_password";

export function ClickHouseResources(
  kubeConfig: KubeConfig,
  namespace: string
): ResourceCollection {
  const collection = new ResourceCollection();

  collection.add(
    new Namespace(
      {
        apiVersion: "v1",
        kind: "Namespace",
        metadata: {
          name: namespace
        }
      },
      kubeConfig
    )
  );

  // TODO(nickbp) better name once replicated, also update jaeger.ts
  const installationName = "basic";

  collection.add(
    new V1ClickhouseinstallationResource(
      {
        apiVersion: "clickhouse.altinity.com/v1",
        kind: "ClickHouseInstallation",
        metadata: {
          name: installationName,
          namespace
        },
        // reference: https://github.com/Altinity/clickhouse-operator/blob/master/deploy/dev/clickhouse-operator-install-yaml-template-01-section-crd-01-chi.yaml#L358
        spec: {
          configuration: {
            clusters: [
              {
                name: "cluster1",
                layout: {
                  shardsCount: 1,
                  replicasCount: 1
                }
              }
            ],
            settings: {
              // Tidy up warnings about failing to listen on IPv6 endpoint
              listen_host: "0.0.0.0"
              // other ClickHouse settings can be added here, slash-delimited
              // reference: https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings/
            },
            users: {
              // Can't use `${CLICKHOUSE_USERNAME}/*` in keys:
              "opstrace_controller/password": `${CLICKHOUSE_PASSWORD}`,
              "opstrace_controller/networks/ip": [
                // Note: could restrict to something like "host local, regexp opstrace-controller-.*\.kube-system\.svc\.cluster\.local"
                "0.0.0.0/0"
              ],
              // controller user can create other users and grant access to them
              "opstrace_controller/access_management": "1"
            }
          },

          defaults: {
            templates: {
              // Replace default PUBLIC LoadBalancer service with an internal ClusterIP service.
              // We don't want ClickHouse accessible to the world!!
              serviceTemplate: "service-template",
              // Configure volumes for storage (/var/lib/clickhouse) and logs (/var/log/clickhouse-server)
              dataVolumeClaimTemplate: "data-volume",
              logVolumeClaimTemplate: "logs-volume",
              // Configure image version, and add capabilities to tidy up startup warnings
              podTemplate: "pod-template"
            }
          },

          templates: {
            // reference: https://github.com/Altinity/clickhouse-operator/blob/master/docs/custom_resource_explained.md#spectemplatespodtemplates
            podTemplates: [
              {
                name: "pod-template",
                spec: {
                  securityContext: {
                    // Required for startup when we specify securityContext in container
                    fsGroup: 101 // clickhouse gid
                  },
                  containers: [
                    {
                      name: "clickhouse",
                      // Default is "latest" tag
                      image: DockerImages.clickhouse,
                      // TODO(nickbp): not actually an option... figure out image pull secrets support
                      //imagePullSecrets: getImagePullSecrets(),
                      securityContext: {
                        // Trying to tidy up startup warnings about missing capabilities,
                        // but doesn't seem to work according to container logs...
                        capabilities: {
                          drop: ["ALL"],
                          add: ["IPC_LOCK", "SYS_NICE"]
                        },
                        // Required for startup when we specify securityContext here
                        runAsUser: 101, // clickhouse uid
                        runAsGroup: 101 // clickhouse gid
                      }
                    }
                  ]
                }
              }
            ],

            // reference: https://github.com/Altinity/clickhouse-operator/blob/master/docs/custom_resource_explained.md#spectemplatesservicetemplates
            serviceTemplates: [
              {
                // creates Service at: basic.clickhouse.svc.cluster.local
                generateName: "{chi}",
                name: "service-template",
                spec: {
                  // Must be provided manually or else deployment fails
                  ports: [
                    {
                      name: "http",
                      port: 8123
                    },
                    {
                      name: "client",
                      port: 9000
                    },
                    {
                      name: "metrics",
                      port: 9001
                    }
                  ],
                  // Default is a PUBLIC LoadBalancer, we don't want that!
                  type: "ClusterIP"
                }
              }
            ],

            // reference: https://github.com/Altinity/clickhouse-operator/blob/master/docs/custom_resource_explained.md#spectemplatesvolumeclaimtemplates
            volumeClaimTemplates: [
              {
                name: "data-volume",
                spec: {
                  accessModes: ["ReadWriteOnce"],
                  resources: {
                    requests: {
                      storage: "10Gi" // TODO(nickbp): Configurable data volume size
                    }
                  },
                  storageClassName: "pd-ssd"
                }
              },
              {
                name: "logs-volume",
                spec: {
                  accessModes: ["ReadWriteOnce"],
                  resources: {
                    requests: {
                      storage: "1Gi"
                    }
                  },
                  storageClassName: "pd-ssd"
                }
              }
            ]
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
          name: "clickhouse",
          namespace,
          labels: {
            app: "clickhouse"
          }
        },
        spec: {
          endpoints: [
            {
              interval: "60s",
              port: "metrics"
            }
          ],
          jobLabel: "job",
          namespaceSelector: {
            matchNames: [namespace]
          },
          selector: {
            matchLabels: {
              "clickhouse.altinity.com/chi": installationName
            }
          }
        }
      },
      kubeConfig
    )
  );

  return collection;
}
