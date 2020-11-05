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

import { KubeConfig } from "@kubernetes/client-node";
import * as yaml from "js-yaml";
import {
  ResourceCollection,
  Service,
  ConfigMap,
  Deployment,
  Namespace,
  V1ServicemonitorResource,
  V1PrometheusruleResource,
  withPodAntiAffinityRequired,
  StatefulSet,
  PersistentVolumeClaim,
  ServiceAccount
} from "@opstrace/kubernetes";
import { State } from "../../reducer";
import { min, select, getBucketName, roundDown } from "@opstrace/utils";
import { getControllerConfig, getNodeCount } from "../../helpers";
import { DockerImages } from "@opstrace/controller-config";

export function LokiResources(
  state: State,
  kubeConfig: KubeConfig,
  namespace: string
): ResourceCollection {
  const collection = new ResourceCollection();
  const { infrastructureName, target, region, gcp } = getControllerConfig(
    state
  );
  const bucketName = getBucketName({
    clusterName: infrastructureName,
    suffix: "loki"
  });
  const clusterName = infrastructureName;

  // https://github.com/grafana/loki/blame/fd451d97f4d6a51ea1f67c1959def077ffb78ee4/production/ksonnet/loki/config.libsonnet#L10
  const grpc_server_max_msg_size = 100 << 20; // 100 MB

  const deploymentConfig = {
    memcachedResults: {
      replicas: select(getNodeCount(state), [
        { "<=": 4, choose: 2 },
        { "<=": 9, choose: 3 },
        {
          "<=": Infinity,
          choose: min(4, roundDown(getNodeCount(state) / 3))
        }
      ]),
      resources: {}
    },
    ingester: {
      resources: {
        //   limits: {
        //     cpu: "6",
        //     memory: "128Gi"
        //   },
        //   requests: {
        //     cpu: "50m",
        //     memory: "100Mi"
        //   }
      },
      replicas: min(
        3,
        select(getNodeCount(state), [
          {
            "<=": Infinity,
            choose: getNodeCount(state)
          }
        ])
      )
    },
    distributor: {
      resources: {
        // limits: {
        //   cpu: "3",
        //   memory: "500Mi"
        // },
        // requests: {
        //   cpu: "50m",
        //   memory: "100Mi"
        // }
      },
      replicas: select(getNodeCount(state), [
        {
          "<=": Infinity,
          choose: getNodeCount(state)
        }
      ])
    },
    querier: {
      resources: {
        //   limits: {
        //     cpu: "12",
        //     memory: "6Gi"
        //   },
        //   requests: {
        //     cpu: "50m",
        //     memory: "100Mi"
        //   }
      },
      replicas: select(getNodeCount(state), [
        {
          "<=": Infinity,
          choose: getNodeCount(state)
        }
      ])
    },
    queryFrontend: {
      replicas: 2 // more than 2 is not beneficial (less advantage of queuing requests in front of queriers)
    },
    env: []
  };

  const lokiConfig = {
    server: {
      http_listen_port: 1080,
      // https://github.com/grafana/loki/blame/fd451d97f4d6a51ea1f67c1959def077ffb78ee4/production/ksonnet/loki/config.libsonnet#L128-L129
      http_server_write_timeout: "1m",
      http_server_idle_timeout: "2m",
      // https://github.com/grafana/loki/blame/fd451d97f4d6a51ea1f67c1959def077ffb78ee4/production/ksonnet/loki/config.libsonnet#L130-L132
      grpc_server_max_recv_msg_size: grpc_server_max_msg_size,
      grpc_server_max_send_msg_size: grpc_server_max_msg_size,
      grpc_server_max_concurrent_streams: 1000
    },
    auth_enabled: true,
    // https://github.com/grafana/loki/blob/fd451d97f4d6a51ea1f67c1959def077ffb78ee4/production/ksonnet/loki/config.libsonnet#L257-L284
    chunk_store_config: {
      chunk_cache_config: {
        memcached: {
          batch_size: 100,
          parallelism: 100
        },
        memcached_client: {
          consistent_hash: true,
          host: `memcached.${namespace}.svc.cluster.local`,
          service: "memcached-client"
        }
      },
      write_dedupe_cache_config: {
        memcached: {
          batch_size: 100,
          parallelism: 100
        },

        memcached_client: {
          host: `memcached-index-writes.${namespace}.svc.cluster.local`,
          service: "memcached-client",
          consistent_hash: true
        }
      },
      max_look_back_period: 0
    },
    // https://github.com/grafana/loki/blob/fd451d97f4d6a51ea1f67c1959def077ffb78ee4/production/ksonnet/loki/config.libsonnet#L179-L192
    limits_config: {
      enforce_metric_name: false,
      // align middleware parallelism with shard factor to optimize one-legged sharded queries.
      max_query_parallelism: 16,
      reject_old_samples: true,
      reject_old_samples_max_age: "168h",
      max_query_length: "12000h", // 500 days
      max_streams_per_user: 0, // disabled in favor of global limit
      max_global_streams_per_user: 10000,
      ingestion_rate_strategy: "global",
      ingestion_rate_mb: 10,
      ingestion_burst_size_mb: 20,
      max_cache_freshness_per_query: "10m"
    },
    querier: {
      // https://github.com/grafana/loki/blob/fd451d97f4d6a51ea1f67c1959def077ffb78ee4/production/ksonnet/loki/config.libsonnet#L177
      query_ingesters_within: "4h" // twice the max-chunk age
    },
    // Reference:
    // https://grafana.com/docs/loki/latest/configuration/#queryrange_config
    //
    // Values taken from:
    // https://github.com/grafana/loki/blob/d38377a2d66c113302a4e96bdceddea35fa32bf3/production/ksonnet/loki/config.libsonnet
    query_range: {
      split_queries_by_interval: "30m",
      align_queries_with_step: true,
      cache_results: true,
      max_retries: 5,
      results_cache: {
        cache: {
          memcached_client: {
            consistent_hash: true,
            host: `memcached-results.${namespace}.svc.cluster.local`,
            service: "memcached-client",
            timeout: "500ms",
            update_interval: "1m",
            max_idle_conns: 16
          }
        }
      }
    },
    frontend: {
      compress_responses: true
    },
    frontend_worker: {
      frontend_address: `query-frontend.${namespace}.svc.cluster.local:9095`,
      // https://github.com/grafana/loki/blob/master/production/ksonnet/loki/config.libsonnet#L150-L151
      parallelism: 4,
      // https://github.com/grafana/loki/blame/fd451d97f4d6a51ea1f67c1959def077ffb78ee4/production/ksonnet/loki/config.libsonnet#L152-L154
      grpc_client_config: {
        // Fix opstrace-prelaunch/issues/1289
        // Enable backoff and retry when a rate limit is hit.
        backoff_on_ratelimits: true,
        max_send_msg_size: grpc_server_max_msg_size
      }
    },
    // https://github.com/grafana/loki/blob/fd451d97f4d6a51ea1f67c1959def077ffb78ee4/production/ksonnet/loki/config.libsonnet#L194-L218
    ingester: {
      chunk_idle_period: "15m",
      chunk_block_size: 262144,
      max_transfer_retries: 60,

      lifecycler: {
        num_tokens: 512,
        heartbeat_period: "5s",
        join_after: "30s",
        observe_period: "30s",
        ring: {
          kvstore: {
            store: "memberlist"
          }
        }
      }
    },
    // https://github.com/grafana/loki/blob/fd451d97f4d6a51ea1f67c1959def077ffb78ee4/production/ksonnet/loki/config.libsonnet#L220-L225
    ingester_client: {
      grpc_client_config: {
        max_recv_msg_size: 1024 * 1024 * 64
      },
      remote_timeout: "1s"
    },
    distributor: {
      ring: {
        kvstore: {
          store: "memberlist"
        }
      }
    },
    memberlist: {
      // https://github.com/cortexproject/cortex/blob/master/docs/configuration/config-file-reference.md#memberlist_config
      // https://grafana.com/docs/loki/latest/configuration/#memberlist_config
      // don't allow split-brain / individual components that think they are
      // not part of a cluster.
      abort_if_cluster_join_fails: true,
      bind_port: 7946,
      join_members: [
        // use a kubernetes headless service for all distributor, ingester and
        // querier components
        `loki-gossip-ring.${namespace}.svc.cluster.local:7946`
      ],
      // these settings are taken from examples in  official documentation
      // https://github.com/grafana/loki/blob/master/docs/sources/configuration/examples.md
      max_join_backoff: "1m",
      max_join_retries: 20,
      min_join_backoff: "1s"
    },
    schema_config: {
      configs: [
        {
          from: "2020-08-01",
          index: {
            prefix: `${clusterName}_loki_index_`,
            // "BoltDB shipper works best with 24h periodic index files"
            period: "24h"
          },
          object_store: target === "gcp" ? "gcs" : "s3",
          schema: "v11",
          store: "boltdb-shipper"
        }
      ]
    },
    compactor: {
      working_directory: "/loki/compactor",
      shared_store: target === "gcp" ? "gcs" : "s3"
    },
    storage_config: {
      boltdb_shipper: {
        active_index_directory: "/loki/index",
        shared_store: target === "gcp" ? "gcs" : "s3",
        cache_location: "/loki/boltdb-cache"
      },
      gcs: {
        bucket_name: bucketName
      },
      aws: {
        s3: `s3://${region}/${bucketName}`
      },
      index_queries_cache_config: {
        // https://github.com/grafana/loki/blob/fd451d97f4d6a51ea1f67c1959def077ffb78ee4/production/ksonnet/loki/config.libsonnet#L229-L232
        memcached: {
          batch_size: 100,
          parallelism: 100
        },
        memcached_client: {
          consistent_hash: true,
          host: `memcached-index-queries.${namespace}.svc.cluster.local`,
          service: "memcached-client"
        }
      }
    }
  };

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

  let annotations = {};
  let serviceAccountName: string | undefined = undefined;
  if (target === "gcp") {
    annotations = {
      "iam.gke.io/gcp-service-account": gcp!.lokiServiceAccount
    };
    serviceAccountName = "loki";
  }

  collection.add(
    new ServiceAccount(
      {
        apiVersion: "v1",
        kind: "ServiceAccount",
        metadata: {
          name: "loki",
          namespace,
          annotations: annotations
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
          "config.yaml": yaml.safeDump(lokiConfig)
        },
        kind: "ConfigMap",
        metadata: {
          name: "loki",
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
            job: `${namespace}.querier`,
            name: "querier"
          },
          name: "querier",
          namespace
        },
        spec: {
          ports: [
            {
              name: "querier-http-metrics",
              port: 1080,
              targetPort: 1080 as any
            },
            {
              name: "querier-grpc",
              port: 9095,
              targetPort: 9095 as any
            }
          ],
          selector: {
            name: "querier"
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
          labels: {
            name: "memcached-results"
          },
          name: "memcached-results",
          namespace
        },
        spec: {
          clusterIP: "None",
          ports: [
            {
              name: "memcached-client",
              port: 11211,
              targetPort: 11211 as any
            },
            {
              name: "exporter-http-metrics",
              port: 9150,
              targetPort: 9150 as any
            }
          ],
          selector: {
            name: "memcached-results"
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
          labels: {
            name: "loki-gossip-ring"
          },
          name: "loki-gossip-ring",
          namespace
        },
        spec: {
          clusterIP: "None",
          ports: [
            {
              name: "loki-gossip-ring",
              port: 7946,
              targetPort: 7946 as any
            }
          ],
          selector: {
            memberlist: "loki-gossip-ring"
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
          labels: {
            name: "querier",
            tenant: "system"
          },
          name: "querier",
          namespace
        },
        spec: {
          endpoints: [
            {
              interval: "30s",
              port: "querier-http-metrics",
              path: "/metrics"
            }
          ],
          jobLabel: "job",
          namespaceSelector: {
            matchNames: [namespace]
          },
          selector: {
            matchLabels: {
              name: "querier"
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
          labels: {
            job: `${namespace}.distributor`,
            name: "distributor"
          },
          name: "distributor",
          namespace
        },
        spec: {
          ports: [
            {
              name: "distributor-http-metrics",
              port: 1080,
              targetPort: 1080 as any
            },
            {
              name: "distributor-grpc",
              port: 9095,
              targetPort: 9095 as any
            }
          ],
          selector: {
            name: "distributor"
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
          labels: {
            name: "distributor",
            tenant: "system"
          },
          name: "distributor",
          namespace
        },
        spec: {
          endpoints: [
            {
              interval: "30s",
              port: "distributor-http-metrics",
              path: "/metrics"
            }
          ],
          jobLabel: "job",
          namespaceSelector: {
            matchNames: [namespace]
          },
          selector: {
            matchLabels: {
              name: "distributor"
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
          labels: {
            job: `${namespace}.query-frontend`,
            name: "query-frontend"
          },
          name: "query-frontend",
          namespace
        },
        spec: {
          clusterIP: "None",
          ports: [
            {
              port: 9095,
              name: "grcp"
            },
            {
              port: 1080,
              name: "http"
            }
          ],
          selector: {
            name: "query-frontend"
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
          labels: {
            name: "query-frontend",
            tenant: "system"
          },
          name: "query-frontend",
          namespace
        },
        spec: {
          endpoints: [
            {
              interval: "30s",
              port: "http",
              path: "/metrics"
            }
          ],
          jobLabel: "job",
          namespaceSelector: {
            matchNames: [namespace]
          },
          selector: {
            matchLabels: {
              name: "query-frontend"
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
          labels: {
            job: `${namespace}.ingester`,
            name: "ingester"
          },
          name: "ingester",
          namespace
        },
        spec: {
          ports: [
            {
              name: "ingester-http-metrics",
              port: 1080,
              targetPort: 1080 as any
            },
            {
              name: "ingester-grpc",
              port: 9095,
              targetPort: 9095 as any
            }
          ],
          selector: {
            name: "ingester"
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
          labels: {
            name: "ingester",
            tenant: "system"
          },
          name: "ingester",
          namespace
        },
        spec: {
          endpoints: [
            {
              interval: "30s",
              port: "ingester-http-metrics",
              path: "/metrics"
            }
          ],
          jobLabel: "job",
          namespaceSelector: {
            matchNames: [namespace]
          },
          selector: {
            matchLabels: {
              name: "ingester"
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
          labels: {
            job: `${namespace}.compactor`,
            name: "compactor"
          },
          name: "compactor",
          namespace
        },
        spec: {
          ports: [
            {
              name: "compactor-http-metrics",
              port: 1080,
              targetPort: 1080 as any
            },
            {
              name: "compactor-grpc",
              port: 9095,
              targetPort: 9095 as any
            }
          ],
          selector: {
            name: "compactor"
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
          labels: {
            name: "compactor",
            tenant: "system"
          },
          name: "compactor",
          namespace
        },
        spec: {
          endpoints: [
            {
              interval: "30s",
              port: "compactor-http-metrics",
              path: "/metrics"
            }
          ],
          jobLabel: "job",
          namespaceSelector: {
            matchNames: [namespace]
          },
          selector: {
            matchLabels: {
              name: "compactor"
            }
          }
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
          name: "distributor",
          namespace
        },
        spec: {
          minReadySeconds: 10,
          replicas: deploymentConfig.distributor.replicas,
          revisionHistoryLimit: 10,
          selector: {
            matchLabels: {
              name: "distributor",
              app: "loki-gossip-ring"
            }
          },
          template: {
            metadata: {
              labels: {
                name: "distributor",
                app: "loki-gossip-ring"
              }
            },
            spec: {
              affinity: withPodAntiAffinityRequired({
                name: "distributor"
              }),
              containers: [
                {
                  args: [
                    "-config.file=/etc/loki/config.yaml",
                    "-target=distributor"
                  ],
                  env: deploymentConfig.env,
                  image: DockerImages.loki,
                  imagePullPolicy: "IfNotPresent",
                  name: "distributor",
                  ports: [
                    {
                      containerPort: 1080,
                      name: "http-metrics"
                    },
                    {
                      containerPort: 9095,
                      name: "grpc"
                    }
                  ],
                  // https://github.com/grafana/loki/blob/6d85c7c212f95c7fbf902b467edc46a5ec3555fd/production/helm/loki/values.yaml#L167-L171
                  readinessProbe: {
                    httpGet: {
                      path: "/ready",
                      port: 1080 as any,
                      scheme: "HTTP"
                    },
                    initialDelaySeconds: 45,
                    timeoutSeconds: 1,
                    periodSeconds: 10,
                    successThreshold: 1,
                    failureThreshold: 3
                  },
                  // https://github.com/grafana/loki/blob/6d85c7c212f95c7fbf902b467edc46a5ec3555fd/production/helm/loki/values.yaml#L117-L121
                  livenessProbe: {
                    httpGet: {
                      path: "/ready",
                      port: 1080 as any,
                      scheme: "HTTP"
                    },
                    initialDelaySeconds: 45,
                    timeoutSeconds: 1,
                    periodSeconds: 10,
                    successThreshold: 1,
                    failureThreshold: 3
                  },
                  resources: deploymentConfig.distributor.resources,
                  volumeMounts: [
                    {
                      mountPath: "/etc/loki",
                      name: "loki"
                    }
                  ]
                }
              ],
              volumes: [
                {
                  configMap: {
                    name: "loki"
                  },
                  name: "loki"
                }
              ]
            }
          }
        }
      },
      kubeConfig
    )
  );

  collection.add(
    new StatefulSet(
      {
        apiVersion: "apps/v1",
        kind: "StatefulSet",
        metadata: {
          name: "ingester",
          namespace
        },
        spec: {
          serviceName: "ingester",
          replicas: deploymentConfig.ingester.replicas,
          revisionHistoryLimit: 10,
          podManagementPolicy: "OrderedReady",
          selector: {
            matchLabels: {
              name: "ingester",
              memberlist: "loki-gossip-ring"
            }
          },
          template: {
            metadata: {
              labels: {
                name: "ingester",
                memberlist: "loki-gossip-ring"
              }
            },
            spec: {
              affinity: withPodAntiAffinityRequired({
                name: "ingester"
              }),
              containers: [
                {
                  args: [
                    "-config.file=/etc/loki/config.yaml",
                    "-target=ingester"
                  ],
                  env: deploymentConfig.env,
                  image: DockerImages.loki,
                  imagePullPolicy: "IfNotPresent",
                  name: "ingester",
                  ports: [
                    {
                      containerPort: 1080,
                      name: "http-metrics"
                    },
                    {
                      containerPort: 9095,
                      name: "grpc"
                    }
                  ],
                  readinessProbe: {
                    httpGet: {
                      path: "/ready",
                      port: 1080 as any,
                      scheme: "HTTP"
                    },
                    initialDelaySeconds: 45,
                    timeoutSeconds: 1,
                    periodSeconds: 10,
                    successThreshold: 1,
                    failureThreshold: 3
                  },
                  livenessProbe: {
                    httpGet: {
                      path: "/ready",
                      port: 1080 as any,
                      scheme: "HTTP"
                    },
                    initialDelaySeconds: 45,
                    timeoutSeconds: 1,
                    periodSeconds: 10,
                    successThreshold: 1,
                    failureThreshold: 3
                  },
                  resources: deploymentConfig.ingester.resources,
                  volumeMounts: [
                    {
                      mountPath: "/etc/loki",
                      name: "loki"
                    },
                    {
                      name: "datadir",
                      mountPath: "/loki"
                    }
                  ]
                }
              ],
              serviceAccountName: serviceAccountName,
              securityContext: {
                fsGroup: 2000
              },
              volumes: [
                {
                  configMap: {
                    name: "loki"
                  },
                  name: "loki"
                },
                {
                  name: "datadir",
                  persistentVolumeClaim: {
                    claimName: "datadir"
                  }
                }
              ]
            }
          },
          volumeClaimTemplates: [
            {
              metadata: {
                name: "datadir"
              },
              spec: {
                storageClassName: "pd-ssd",
                accessModes: ["ReadWriteOnce"],
                resources: {
                  requests: {
                    storage: "10Gi"
                  }
                }
              }
            }
          ]
        }
      },
      kubeConfig
    )
  );

  collection.add(
    new PersistentVolumeClaim(
      {
        apiVersion: "v1",
        kind: "PersistentVolumeClaim",
        metadata: {
          name: "compactor-datadir-storage-claim",
          namespace
        },
        spec: {
          storageClassName: "pd-ssd",
          accessModes: ["ReadWriteOnce"],
          resources: {
            requests: {
              storage: "10Gi"
            }
          }
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
          name: "compactor",
          namespace
        },
        spec: {
          revisionHistoryLimit: 10,
          // no more than one compactor instance at any given time, see
          // boltdb shipper docs
          replicas: 1,
          selector: {
            matchLabels: {
              name: "compactor"
            }
          },
          template: {
            metadata: {
              labels: {
                name: "compactor"
              }
            },
            spec: {
              affinity: withPodAntiAffinityRequired({
                name: "compactor"
              }),
              containers: [
                {
                  args: [
                    "-config.file=/etc/loki/config.yaml",
                    "-target=compactor"
                  ],
                  env: deploymentConfig.env,
                  image: DockerImages.loki,
                  imagePullPolicy: "IfNotPresent",
                  name: "compactor",
                  ports: [
                    {
                      containerPort: 1080,
                      name: "http-metrics"
                    },
                    {
                      containerPort: 9095,
                      name: "grpc"
                    }
                  ],
                  readinessProbe: {
                    httpGet: {
                      path: "/ready",
                      port: 1080 as any,
                      scheme: "HTTP"
                    },
                    initialDelaySeconds: 15,
                    timeoutSeconds: 1,
                    periodSeconds: 10,
                    successThreshold: 1,
                    failureThreshold: 3
                  },
                  livenessProbe: {
                    httpGet: {
                      path: "/ready",
                      port: 1080 as any,
                      scheme: "HTTP"
                    },
                    initialDelaySeconds: 15,
                    timeoutSeconds: 1,
                    periodSeconds: 10,
                    successThreshold: 1,
                    failureThreshold: 3
                  },
                  resources: deploymentConfig.querier.resources,
                  volumeMounts: [
                    {
                      mountPath: "/etc/loki",
                      name: "loki"
                    },
                    {
                      name: "datadir",
                      mountPath: "/loki"
                    }
                  ]
                }
              ],
              securityContext: {
                fsGroup: 2000
              },
              serviceAccountName: serviceAccountName,
              volumes: [
                {
                  configMap: {
                    name: "loki"
                  },
                  name: "loki"
                },
                {
                  name: "datadir",
                  persistentVolumeClaim: {
                    claimName: "compactor-datadir-storage-claim"
                  }
                }
              ]
            }
          }
        }
      },
      kubeConfig
    )
  );

  collection.add(
    new StatefulSet(
      {
        apiVersion: "apps/v1",
        kind: "StatefulSet",
        metadata: {
          name: "querier",
          namespace
        },
        spec: {
          serviceName: "querier",
          replicas: deploymentConfig.querier.replicas,
          revisionHistoryLimit: 10,
          podManagementPolicy: "OrderedReady",
          selector: {
            matchLabels: {
              name: "querier",
              memberlist: "loki-gossip-ring"
            }
          },
          template: {
            metadata: {
              labels: {
                name: "querier",
                memberlist: "loki-gossip-ring"
              }
            },
            spec: {
              affinity: withPodAntiAffinityRequired({
                name: "querier"
              }),
              containers: [
                {
                  args: [
                    "-config.file=/etc/loki/config.yaml",
                    "-target=querier"
                  ],
                  env: deploymentConfig.env,
                  image: DockerImages.loki,
                  imagePullPolicy: "IfNotPresent",
                  name: "querier",
                  ports: [
                    {
                      containerPort: 1080,
                      name: "http-metrics"
                    },
                    {
                      containerPort: 9095,
                      name: "grpc"
                    }
                  ],
                  readinessProbe: {
                    httpGet: {
                      path: "/ready",
                      port: 1080 as any,
                      scheme: "HTTP"
                    },
                    initialDelaySeconds: 15,
                    timeoutSeconds: 1,
                    periodSeconds: 10,
                    successThreshold: 1,
                    failureThreshold: 3
                  },
                  livenessProbe: {
                    httpGet: {
                      path: "/ready",
                      port: 1080 as any,
                      scheme: "HTTP"
                    },
                    initialDelaySeconds: 15,
                    timeoutSeconds: 1,
                    periodSeconds: 10,
                    successThreshold: 1,
                    failureThreshold: 3
                  },
                  resources: deploymentConfig.querier.resources,
                  volumeMounts: [
                    {
                      mountPath: "/etc/loki",
                      name: "loki"
                    },
                    {
                      name: "cachedir",
                      mountPath: "/loki"
                    }
                  ]
                }
              ],
              serviceAccountName: serviceAccountName,
              securityContext: {
                fsGroup: 2000
              },
              volumes: [
                {
                  configMap: {
                    name: "loki"
                  },
                  name: "loki"
                },
                {
                  name: "cachedir",
                  persistentVolumeClaim: {
                    claimName: "cachedir"
                  }
                }
              ]
            }
          },
          volumeClaimTemplates: [
            {
              metadata: {
                name: "cachedir"
              },
              spec: {
                storageClassName: "pd-ssd",
                accessModes: ["ReadWriteOnce"],
                resources: {
                  requests: {
                    storage: "10Gi"
                  }
                }
              }
            }
          ]
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
          name: "query-frontend",
          namespace
        },
        spec: {
          replicas: deploymentConfig.queryFrontend.replicas,
          selector: {
            matchLabels: {
              name: "query-frontend"
            }
          },
          template: {
            metadata: {
              labels: {
                name: "query-frontend"
              }
            },
            spec: {
              affinity: withPodAntiAffinityRequired({
                name: "query-frontend"
              }),
              containers: [
                {
                  name: "query-frontend",
                  image: DockerImages.loki,
                  imagePullPolicy: "IfNotPresent",
                  args: [
                    "-target=query-frontend",
                    "-config.file=/etc/loki/config.yaml"
                  ],
                  env: deploymentConfig.env,
                  ports: [
                    {
                      containerPort: 9095,
                      name: "grpc"
                    },
                    {
                      containerPort: 80,
                      name: "http"
                    }
                  ],
                  volumeMounts: [
                    {
                      mountPath: "/etc/loki",
                      name: "loki"
                    }
                  ]
                }
              ],
              volumes: [
                {
                  configMap: {
                    name: "loki"
                  },
                  name: "loki"
                }
              ]
            }
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
          labels: {
            name: "memcached-results",
            tenant: "system"
          },
          name: "memcached-results",
          namespace
        },
        spec: {
          endpoints: [
            {
              interval: "30s",
              port: "exporter-http-metrics",
              path: "/metrics"
            }
          ],
          jobLabel: "name",
          namespaceSelector: {
            matchNames: [namespace]
          },
          selector: {
            matchLabels: {
              name: "memcached-results"
            }
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
          labels: {
            name: "memcached",
            tenant: "system"
          },
          name: "memcached-index-writes",
          namespace
        },
        spec: {
          endpoints: [
            {
              interval: "30s",
              port: "exporter-http-metrics",
              path: "/metrics"
            }
          ],
          jobLabel: "name",
          namespaceSelector: {
            matchNames: [namespace]
          },
          selector: {
            matchLabels: {
              name: "memcached-index-writes"
            }
          }
        }
      },
      kubeConfig
    )
  );

  collection.add(
    new StatefulSet(
      {
        apiVersion: "apps/v1",
        kind: "StatefulSet",
        metadata: {
          name: "memcached-results",
          namespace
        },
        spec: {
          replicas: deploymentConfig.memcachedResults.replicas,
          serviceName: "memcached-results",
          podManagementPolicy: "Parallel",
          selector: {
            matchLabels: {
              name: "memcached-results"
            }
          },
          template: {
            metadata: {
              labels: {
                name: "memcached-results"
              }
            },
            spec: {
              affinity: withPodAntiAffinityRequired({
                name: "memcached-results"
              }),
              containers: [
                {
                  args: ["-m 4096", "-I 2m", "-c 1024", "-v"],
                  image: DockerImages.memcached,
                  imagePullPolicy: "IfNotPresent",
                  name: "memcached",
                  ports: [
                    {
                      containerPort: 11211,
                      name: "client"
                    }
                  ],
                  resources: deploymentConfig.memcachedResults.resources
                },
                {
                  args: [
                    "--memcached.address=localhost:11211",
                    "--web.listen-address=0.0.0.0:9150"
                  ],
                  image: DockerImages.memcachedExporter,
                  imagePullPolicy: "IfNotPresent",
                  name: "exporter",
                  ports: [
                    {
                      containerPort: 9150,
                      name: "http-metrics"
                    }
                  ]
                }
              ]
            }
          },
          updateStrategy: {
            type: "RollingUpdate"
          },
          volumeClaimTemplates: []
        }
      },
      kubeConfig
    )
  );

  collection.add(
    new V1PrometheusruleResource(
      {
        apiVersion: "monitoring.coreos.com/v1",
        kind: "PrometheusRule",
        metadata: {
          labels: {
            prometheus: "system-prometheus",
            role: "alert-rules",
            tenant: "system"
          },
          name: "loki-rules",
          namespace
        },
        spec: {
          groups: [
            {
              name: "loki_rules",
              rules: [
                {
                  expr:
                    "histogram_quantile(0.99, sum(rate(loki_request_duration_seconds_bucket[1m])) by (le, job))",
                  record: "job:loki_request_duration_seconds:99quantile"
                },
                {
                  expr:
                    "histogram_quantile(0.50, sum(rate(loki_request_duration_seconds_bucket[1m])) by (le, job))",
                  record: "job:loki_request_duration_seconds:50quantile"
                },
                {
                  expr:
                    "sum(rate(loki_request_duration_seconds_sum[1m])) by (job) / sum(rate(loki_request_duration_seconds_count[1m])) by (job)",
                  record: "job:loki_request_duration_seconds:avg"
                },
                {
                  expr:
                    "sum(rate(loki_request_duration_seconds_bucket[1m])) by (le, job)",
                  record: "job:loki_request_duration_seconds_bucket:sum_rate"
                },
                {
                  expr:
                    "sum(rate(loki_request_duration_seconds_sum[1m])) by (job)",
                  record: "job:loki_request_duration_seconds_sum:sum_rate"
                },
                {
                  expr:
                    "sum(rate(loki_request_duration_seconds_count[1m])) by (job)",
                  record: "job:loki_request_duration_seconds_count:sum_rate"
                },
                {
                  expr:
                    "histogram_quantile(0.99, sum(rate(loki_request_duration_seconds_bucket[1m])) by (le, job, route))",
                  record: "job_route:loki_request_duration_seconds:99quantile"
                },
                {
                  expr:
                    "histogram_quantile(0.50, sum(rate(loki_request_duration_seconds_bucket[1m])) by (le, job, route))",
                  record: "job_route:loki_request_duration_seconds:50quantile"
                },
                {
                  expr:
                    "sum(rate(loki_request_duration_seconds_sum[1m])) by (job, route) / sum(rate(loki_request_duration_seconds_count[1m])) by (job, route)",
                  record: "job_route:loki_request_duration_seconds:avg"
                },
                {
                  expr:
                    "sum(rate(loki_request_duration_seconds_bucket[1m])) by (le, job, route)",
                  record:
                    "job_route:loki_request_duration_seconds_bucket:sum_rate"
                },
                {
                  expr:
                    "sum(rate(loki_request_duration_seconds_sum[1m])) by (job, route)",
                  record: "job_route:loki_request_duration_seconds_sum:sum_rate"
                },
                {
                  expr:
                    "sum(rate(loki_request_duration_seconds_count[1m])) by (job, route)",
                  record:
                    "job_route:loki_request_duration_seconds_count:sum_rate"
                },
                {
                  expr:
                    "histogram_quantile(0.99, sum(rate(loki_request_duration_seconds_bucket[1m])) by (le, namespace, job, route))",
                  record:
                    "namespace_job_route:loki_request_duration_seconds:99quantile"
                },
                {
                  expr:
                    "histogram_quantile(0.50, sum(rate(loki_request_duration_seconds_bucket[1m])) by (le, namespace, job, route))",
                  record:
                    "namespace_job_route:loki_request_duration_seconds:50quantile"
                },
                {
                  expr:
                    "sum(rate(loki_request_duration_seconds_sum[1m])) by (namespace, job, route) / sum(rate(loki_request_duration_seconds_count[1m])) by (namespace, job, route)",
                  record:
                    "namespace_job_route:loki_request_duration_seconds:avg"
                },
                {
                  expr:
                    "sum(rate(loki_request_duration_seconds_bucket[1m])) by (le, namespace, job, route)",
                  record:
                    "namespace_job_route:loki_request_duration_seconds_bucket:sum_rate"
                },
                {
                  expr:
                    "sum(rate(loki_request_duration_seconds_sum[1m])) by (namespace, job, route)",
                  record:
                    "namespace_job_route:loki_request_duration_seconds_sum:sum_rate"
                },
                {
                  expr:
                    "sum(rate(loki_request_duration_seconds_count[1m])) by (namespace, job, route)",
                  record:
                    "namespace_job_route:loki_request_duration_seconds_count:sum_rate"
                }
              ]
            }
          ]
        }
      },
      kubeConfig
    )
  );

  collection.add(
    new V1PrometheusruleResource(
      {
        apiVersion: "monitoring.coreos.com/v1",
        kind: "PrometheusRule",
        metadata: {
          labels: {
            prometheus: "system-prometheus",
            role: "alert-rules",
            tenant: "system"
          },
          name: "loki-alerts",
          namespace
        },
        spec: {
          groups: [
            {
              name: "loki_alerts",
              rules: [
                {
                  alert: "LokiRequestErrors",
                  annotations: {
                    message:
                      '{{ $labels.job }} {{ $labels.route }} is experiencing {{ printf "%.2f" $value }}% errors.\n'
                  },
                  // TODO (clambert) return the threhold of this alert back to the original 18.
                  expr:
                    '100 * sum(rate(loki_request_duration_seconds_count{status_code=~"5.."}[1m])) by (namespace, job, route)\n  /\nsum(rate(loki_request_duration_seconds_count[1m])) by (namespace, job, route)\n  > 25\n',
                  for: "15m",
                  labels: {
                    severity: "critical"
                  }
                },
                {
                  alert: "LokiRequestLatency",
                  annotations: {
                    message:
                      '{{ $labels.job }} {{ $labels.route }} is experiencing {{ printf "%.2f" $value }}s 99th percentile latency.\n'
                  },
                  expr:
                    'namespace_job_route:loki_request_duration_seconds:99quantile{route!~"(?i).*tail.*"} > 2.5\n',
                  for: "15m",
                  labels: {
                    severity: "critical"
                  }
                }
              ]
            }
          ]
        }
      },
      kubeConfig
    )
  );

  return collection;
}
