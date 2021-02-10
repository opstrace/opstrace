/**
 * Copyright 2019-2021 Opstrace, Inc.
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
  DaemonSet,
  ConfigMap,
  ServiceAccount,
  ClusterRole,
  ClusterRoleBinding
} from "@opstrace/kubernetes";
import { State } from "../../reducer";
import { Tenant } from "@opstrace/tenants";
import { KubeConfig } from "@kubernetes/client-node";
import { getTenantNamespace } from "../../helpers";
import { DockerImages } from "@opstrace/controller-config";

export function SystemLogAgentResources(
  state: State,
  tenant: Tenant,
  kubeConfig: KubeConfig
): ResourceCollection {
  const collection = new ResourceCollection();

  if (tenant.type !== "SYSTEM") {
    return collection;
  }

  const tenantNamespace = getTenantNamespace(tenant);

  const componentName = `systemlog`;

  collection.add(
    new ConfigMap(
      {
        apiVersion: "v1",
        kind: "ConfigMap",
        metadata: {
          name: "systemlog-fluentd-config",
          namespace: tenantNamespace,
          labels: {
            "k8s-app": "systemlog-fluentd"
          }
        },
        data: {
          "fluent.conf": `
<source>
  @type tail
  path /var/log/containers/*.log

  # Expect format written by Docker JSON File logging driver.
  format json

  # Note: this file should survive fluentd (container) restarts.
  # See opstrace-prelaunch/issues/434
  pos_file fluentd-docker.pos

  # keep 'time' field in the record (value is string in RFC3339Nano format
  # written by the Docker JSON File logging driver).
  keep_time_key true
  time_format %Y-%m-%dT%H:%M:%S.%NZ

  # Prepend tag to indicate that all log files in /var/log/containers
  # are written by containers managed by k8s.
  tag kubernetes.*

  # Start reading from the head of the file after startup to read system
  # logs created during system bootstrap before fluentd came up.
  # See opstrace-prelaunch/issues/433
  read_from_head true
</source>

<filter kubernetes.**>
  @type kubernetes_metadata
  @id filter_kube_metadata
</filter>

# The kubernetes metadata filter enriches each record with a complex
# metadata structure.
# See https://github.com/fabric8io/fluent-plugin-kubernetes_metadata_filter#example-inputoutput
# Now lift some of the desired attributes to be top-level record attributes,
# to be used as labels in the next (output) stage. Also drop the undesired
# fields in this stage.
<filter kubernetes.**>
  @type record_transformer
  enable_ruby true
  remove_keys kubernetes, docker
  <record>
    k8s_host \${record.dig("kubernetes", "host")}
    k8s_pod_name \${record.dig("kubernetes", "pod_name")}
    k8s_namespace_name \${record.dig("kubernetes", "namespace_name")}
    k8s_container_name \${record.dig("kubernetes", "container_name")}
  </record>
</filter>

<match kubernetes.**>

  @type loki
  url http://loki-api.system-tenant.svc.cluster.local:8080

  bearer_token_file /var/run/opstrace/system_tenant_api_auth_token

  <label>
    k8s_host
    k8s_pod_name
    k8s_namespace_name
    k8s_container_name
  </label>

  <buffer>
    @type memory
    chunk_limit_size 512kb
    flush_interval 1s
  </buffer>
</match>
`
        }
      },
      kubeConfig
    )
  );

  collection.add(
    new DaemonSet(
      {
        apiVersion: "apps/v1",
        kind: "DaemonSet",
        metadata: {
          name: componentName,
          namespace: tenantNamespace,
          labels: {
            "k8s-app": "systemlog-fluentd",
            version: "v1",
            "kubernetes.io/cluster-service": "true"
          }
        },
        spec: {
          updateStrategy: {
            type: "RollingUpdate"
          },
          selector: {
            matchLabels: {
              "k8s-app": "systemlog-fluentd"
            }
          },
          template: {
            metadata: {
              labels: {
                "k8s-app": "systemlog-fluentd",
                version: "v1"
              }
            },
            spec: {
              tolerations: [
                {
                  key: "node-role.kubernetes.io/master",
                  effect: "NoSchedule"
                }
              ],
              containers: [
                {
                  name: "systemlog-fluentd",
                  image: DockerImages.systemlogFluentd,
                  env: [
                    {
                      name: "K8S_NODE_NAME",
                      valueFrom: {
                        fieldRef: {
                          fieldPath: "spec.nodeName"
                        }
                      }
                    }
                  ],
                  resources: {
                    limits: {
                      cpu: "8",
                      memory: "10Gi"
                    },
                    requests: {
                      cpu: "50m",
                      memory: "100Mi"
                    }
                  },
                  volumeMounts: [
                    {
                      name: "varlog",
                      mountPath: "/var/log"
                    },
                    {
                      name: "varlibdockercontainers",
                      mountPath: "/var/lib/docker/containers",
                      readOnly: true
                    },
                    {
                      name: "fluentd-config",
                      mountPath: "/fluentd/etc/"
                    },
                    {
                      name: "authtoken-secret",
                      // "Each key in the secret data map becomes the filename under mountPath."
                      mountPath: "/var/run/opstrace",
                      readOnly: true
                    }
                  ]
                }
              ],
              terminationGracePeriodSeconds: 30,
              volumes: [
                {
                  name: "varlog",
                  hostPath: {
                    path: "/var/log"
                  }
                },
                {
                  name: "varlibdockercontainers",
                  hostPath: {
                    path: "/var/lib/docker/containers"
                  }
                },
                {
                  name: "fluentd-config",
                  configMap: {
                    name: "systemlog-fluentd-config"
                  }
                },
                {
                  name: "authtoken-secret",
                  secret: {
                    secretName: "system-tenant-api-auth-token"
                  }
                }
              ],
              serviceAccountName: componentName
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
          name: componentName,
          namespace: tenantNamespace
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
          name: componentName
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
          name: componentName
        },
        roleRef: {
          apiGroup: "rbac.authorization.k8s.io",
          kind: "ClusterRole",
          name: componentName
        },
        subjects: [
          {
            kind: "ServiceAccount",
            name: componentName,
            namespace: tenantNamespace
          }
        ]
      },
      kubeConfig
    )
  );

  return collection;
}
