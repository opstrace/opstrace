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
import * as yaml from "js-yaml";
import {
  ClusterRole,
  ClusterRoleBinding,
  ConfigMap,
  CustomResourceDefinition,
  Deployment,
  ResourceCollection,
  Service,
  ServiceAccount,
  Secret,
  V1ServicemonitorResource,
  clickhouseinstallations,
  clickhouseinstallationtemplates,
  clickhouseoperatorconfigurations
} from "@opstrace/kubernetes";
import { generateSecretValue } from "../../helpers";
import { DockerImages, getImagePullSecrets } from "@opstrace/controller-config";

export function ClickHouseOperatorResources(
  kubeConfig: KubeConfig,
  namespace: string,
  clickhouseNamespace: string
): ResourceCollection {
  const collection = new ResourceCollection();

  collection.add(
    new CustomResourceDefinition(clickhouseinstallations, kubeConfig)
  );
  collection.add(
    new CustomResourceDefinition(clickhouseinstallationtemplates, kubeConfig)
  );
  collection.add(
    new CustomResourceDefinition(clickhouseoperatorconfigurations, kubeConfig)
  );

  const clickhousePasswordSecret = new Secret(
    {
      apiVersion: "v1",
      kind: "Secret",
      metadata: {
        name: "clickhouse-operator-password",
        namespace
      },
      data: {
        password: Buffer.from(generateSecretValue()).toString("base64")
      }
    },
    kubeConfig
  );
  // We don't want this value to change once it exists.
  // The value of this secret can always be updated manually in the cluster if needs be (kubectl delete <name> -n application) and the controller will create a new one.
  clickhousePasswordSecret.setImmutable();
  collection.add(clickhousePasswordSecret);

  collection.add(
    new ServiceAccount(
      {
        apiVersion: "v1",
        kind: "ServiceAccount",
        metadata: {
          name: "clickhouse-operator",
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
          name: "clickhouse-operator"
        },
        rules: [
          {
            apiGroups: [""],
            resources: ["configmaps", "services"],
            verbs: [
              "create",
              "delete",
              "get",
              "patch",
              "update",
              "list",
              "watch"
            ]
          },
          {
            apiGroups: [""],
            resources: ["endpoints"],
            verbs: ["get", "list", "watch"]
          },
          {
            apiGroups: [""],
            resources: ["events"],
            verbs: ["create"]
          },
          {
            apiGroups: [""],
            resources: ["persistentvolumeclaims"],
            verbs: ["delete", "get", "list", "patch", "update", "watch"]
          },
          {
            apiGroups: [""],
            resources: ["persistentvolumes", "pods"],
            verbs: ["get", "list", "patch", "update", "watch"]
          },
          {
            apiGroups: ["apps"],
            resources: ["statefulsets"],
            verbs: [
              "create",
              "delete",
              "get",
              "patch",
              "update",
              "list",
              "watch"
            ]
          },
          {
            apiGroups: ["apps"],
            resources: ["replicasets"],
            verbs: ["delete", "get", "patch", "update"]
          },
          {
            apiGroups: ["apps"],
            resourceNames: ["clickhouse-operator"],
            resources: ["deployments"],
            verbs: ["get", "patch", "update", "delete"]
          },
          {
            apiGroups: ["policy"],
            resources: ["poddisruptionbudgets"],
            verbs: [
              "create",
              "delete",
              "get",
              "patch",
              "update",
              "list",
              "watch"
            ]
          },
          {
            apiGroups: ["clickhouse.altinity.com"],
            resources: ["clickhouseinstallations"],
            verbs: ["delete", "get", "patch", "update"]
          },
          {
            apiGroups: ["clickhouse.altinity.com"],
            resources: [
              "clickhouseinstallations",
              "clickhouseinstallationtemplates",
              "clickhouseoperatorconfigurations"
            ],
            verbs: ["get", "list", "watch"]
          },
          {
            apiGroups: ["clickhouse.altinity.com"],
            resources: [
              "clickhouseinstallations/finalizers",
              "clickhouseinstallationtemplates/finalizers",
              "clickhouseoperatorconfigurations/finalizers"
            ],
            verbs: ["update"]
          },
          {
            apiGroups: [""],
            resources: ["secrets"],
            verbs: ["get", "list"]
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
          name: `clickhouse-operator-${namespace}`
        },
        roleRef: {
          apiGroup: "rbac.authorization.k8s.io",
          kind: "ClusterRole",
          name: "clickhouse-operator"
        },
        subjects: [
          {
            kind: "ServiceAccount",
            name: "clickhouse-operator",
            namespace
          }
        ]
      },
      kubeConfig
    )
  );

  const operatorConfig = {
    // watched namespaces
    watchNamespaces: [clickhouseNamespace],

    // config paths
    chCommonConfigsPath: "config.d",
    //chHostConfigsPath: "conf.d",
    chUsersConfigsPath: "users.d",
    //chiTemplatesPath: "templates.d",

    // cluster objects
    statefulSetUpdateTimeout: 300,
    statefulSetUpdatePollPeriod: 5,
    onStatefulSetCreateFailureAction: "ignore",
    onStatefulSetUpdateFailureAction: "rollback",

    // user config
    //chConfigUserDefaultProfile: "default",
    //chConfigUserDefaultQuota: "default",
    //chConfigUserDefaultNetworksIP: ["127.0.0.1"],
    //chConfigUserDefaultPassword: "default",
    //chConfigNetworksHostRegexpTemplate: "(chi-{chi}-[^.]+\\d+-\\d+|clickhouse\\-{chi})\\.{namespace}\\.svc\\.cluster\\.local$",

    // operator access
    //chUsername: clickhouse_operator,
    //chPassword: clickhouse_operator_password,
    chCredentialsSecretNamespace: namespace,
    chCredentialsSecretName: "clickhouse-operator-password",
    chPort: 8123,

    // logging
    logtostderr: "true",
    alsologtostderr: "false",
    v: "1",
    stderrthreshold: "",
    vmodule: "",
    log_backtrace_at: "",

    // runtime
    reconcileThreadsNumber: 10,
    reconcileWaitExclude: true,
    reconcileWaitInclude: false,

    // labels management
    appendScopeLabels: "no"
  };

  const clickhouseConfig = `
<yandex>

  <!-- Listen wildcard address to allow accepting connections from other containers and host network. -->
  <listen_host>0.0.0.0</listen_host>

  <listen_try>1</listen_try>

  <logger>
    <!-- Possible levels: https://github.com/pocoproject/poco/blob/develop/Foundation/include/Poco/Logger.h#L105 -->
    <level>debug</level>
    <log>/var/log/clickhouse-server/clickhouse-server.log</log>
    <errorlog>/var/log/clickhouse-server/clickhouse-server.err.log</errorlog>
    <size>1000M</size>
    <count>10</count>
    <!-- Default behavior is autodetection (log to console if not daemon mode and is tty) -->
    <console>1</console>
  </logger>

  <prometheus>
    <endpoint>/metrics</endpoint>
    <port>8001</port>
    <metrics>true</metrics>
    <events>true</events>
    <asynchronous_metrics>true</asynchronous_metrics>
  </prometheus>

  <query_log replace="1">
    <database>system</database>
    <table>query_log</table>
    <engine>Engine = MergeTree PARTITION BY event_date ORDER BY event_time TTL event_date + interval 30 day</engine>
    <flush_interval_milliseconds>7500</flush_interval_milliseconds>
  </query_log>

  <query_thread_log remove="1"/>

  <part_log replace="1">
    <database>system</database>
    <table>part_log</table>
    <engine>Engine = MergeTree PARTITION BY event_date ORDER BY event_time TTL event_date + interval 30 day</engine>
    <flush_interval_milliseconds>7500</flush_interval_milliseconds>
  </part_log>

</yandex>`;

  const clickhouseUserConfig = `
<yandex>

  <users>
    <clickhouse_operator>
      <networks>
        <ip>127.0.0.1</ip>
        <ip>0.0.0.0/0</ip>
      </networks>
      <!-- replaced with actual secret SHA on pod startup -->
      <password_sha256_hex>%%OPERATOR_PASSWORD%%</password_sha256_hex>
      <profile>clickhouse_operator</profile>
      <quota>default</quota>
    </clickhouse_operator>
  </users>

  <profiles>
    <clickhouse_operator>
      <log_queries>0</log_queries>
      <skip_unavailable_shards>1</skip_unavailable_shards>
      <http_connection_timeout>10</http_connection_timeout>
    </clickhouse_operator>

    <default>
      <log_queries>1</log_queries>
      <connect_timeout_with_failover_ms>1000</connect_timeout_with_failover_ms>
      <distributed_aggregation_memory_efficient>1</distributed_aggregation_memory_efficient>
      <parallel_view_processing>1</parallel_view_processing>
      <default_database_engine>Ordinary</default_database_engine>
    </default>
  </profiles>

</yandex>`;

  collection.add(
    new ConfigMap(
      {
        apiVersion: "v1",
        data: {
          "operator-config.yaml": yaml.safeDump(operatorConfig),
          "clickhouse-config.xml": clickhouseConfig,
          "clickhouse-users.xml": clickhouseUserConfig
        },
        kind: "ConfigMap",
        metadata: {
          name: "clickhouse-operator",
          namespace
        }
      },
      kubeConfig
    )
  );

  collection.add(
    new Deployment(
      {
        apiVersion: "apps/v1",
        kind: "Deployment",
        metadata: {
          name: "clickhouse-operator",
          namespace,
          labels: {
            app: "clickhouse-operator"
          }
        },
        spec: {
          selector: {
            matchLabels: {
              app: "clickhouse-operator"
            }
          },
          replicas: 1,
          template: {
            metadata: {
              labels: {
                app: "clickhouse-operator"
              }
            },
            spec: {
              serviceAccountName: "clickhouse-operator",
              volumes: [
                {
                  name: "operator-config",
                  configMap: {
                    name: "clickhouse-operator",
                    items: [
                      {
                        key: "clickhouse-operator.yaml",
                        path: "clickhouse-operator.yaml"
                      }
                    ]
                  }
                },
                {
                  name: "clickhouse-config",
                  configMap: {
                    name: "clickhouse-operator",
                    items: [
                      {
                        key: "clickhouse-config.xml",
                        path: "clickhouse-config.xml"
                      }
                    ]
                  }
                },
                {
                  name: "clickhouse-user-config",
                  configMap: {
                    name: "clickhouse-operator",
                    items: [
                      {
                        key: "clickhouse-users.xml.tmpl",
                        path: "clickhouse-users.xml.tmpl"
                      }
                    ]
                  }
                }
              ],
              containers: [
                {
                  name: "clickhouse-operator",
                  image: DockerImages.clickhouseOperator,
                  // Write the desired operator password from the secret to the ClickHouse xml config
                  command: [
                    "/bin/sh",
                    "-c",
                    "sed \"s/%%OPERATOR_PASSWORD%%/$(echo -n $OPERATOR_PASSWORD | sha256sum | tr -d '-')/g\" /tmp/clickhouse-users.xml.tmpl > /etc/clickhouse-operator/users.d/clickhouse-users.xml && /clickhouse-operator -logtostderr=true -v=1"
                  ],
                  volumeMounts: [
                    {
                      name: "operator-config",
                      mountPath: "/etc/clickhouse-operator"
                    },
                    {
                      name: "clickhouse-config",
                      mountPath: "/etc/clickhouse-operator/config.d"
                    },
                    {
                      name: "clickhouse-user-config",
                      mountPath: "/tmp/"
                    }
                  ],
                  env: [
                    {
                      name: "OPERATOR_PASSWORD",
                      valueFrom: {
                        secretKeyRef: {
                          name: "clickhouse-operator-password",
                          key: "password"
                        }
                      }
                    },
                    {
                      name: "OPERATOR_POD_NODE_NAME",
                      valueFrom: {
                        fieldRef: { fieldPath: "spec.nodeName" }
                      }
                    },
                    {
                      name: "OPERATOR_POD_NAME",
                      valueFrom: {
                        fieldRef: { fieldPath: "metadata.name" }
                      }
                    },
                    {
                      name: "OPERATOR_POD_NAMESPACE",
                      valueFrom: {
                        fieldRef: { fieldPath: "metadata.namespace" }
                      }
                    },
                    {
                      name: "OPERATOR_POD_IP",
                      valueFrom: {
                        fieldRef: { fieldPath: "status.podIP" }
                      }
                    },
                    {
                      name: "OPERATOR_POD_SERVICE_ACCOUNT",
                      valueFrom: {
                        fieldRef: { fieldPath: "spec.serviceAccountName" }
                      }
                    },
                    {
                      name: "OPERATOR_CONTAINER_CPU_REQUEST",
                      valueFrom: {
                        resourceFieldRef: {
                          containerName: "clickhouse-operator",
                          resource: "requests.cpu"
                        }
                      }
                    },
                    {
                      name: "OPERATOR_CONTAINER_CPU_LIMIT",
                      valueFrom: {
                        resourceFieldRef: {
                          containerName: "clickhouse-operator",
                          resource: "limits.cpu"
                        }
                      }
                    },
                    {
                      name: "OPERATOR_CONTAINER_MEM_REQUEST",
                      valueFrom: {
                        resourceFieldRef: {
                          containerName: "clickhouse-operator",
                          resource: "requests.memory"
                        }
                      }
                    },
                    {
                      name: "OPERATOR_CONTAINER_MEM_LIMIT",
                      valueFrom: {
                        resourceFieldRef: {
                          containerName: "clickhouse-operator",
                          resource: "limits.memory"
                        }
                      }
                    }
                  ]
                },
                {
                  name: "exporter",
                  image: DockerImages.clickhouseOperatorExporter,
                  // TODO(nickbp) skipping volumeMounts, are they actually needed?
                  ports: [
                    {
                      containerPort: 6379,
                      name: "metrics"
                    }
                  ]
                }
              ],
              imagePullSecrets: getImagePullSecrets()
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
          name: "clickhouse-operator",
          namespace,
          labels: {
            app: "clickhouse-operator"
          }
        },
        spec: {
          ports: [
            {
              name: "metrics",
              port: 6379,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: "metrics" as any
            }
          ],
          selector: {
            app: "clickhouse-operator"
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
          name: "clickhouse-operator",
          namespace,
          labels: {
            app: "clickhouse-operator"
          }
        },
        spec: {
          endpoints: [
            {
              interval: "30s",
              port: "metrics",
              path: "/metrics"
            }
          ],
          jobLabel: "job",
          namespaceSelector: {
            matchNames: [namespace]
          },
          selector: {
            matchLabels: {
              app: "clickhouse-operator"
            }
          }
        }
      },
      kubeConfig
    )
  );

  return collection;
}
