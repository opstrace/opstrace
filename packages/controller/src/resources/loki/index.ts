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
import { strict as assert } from "assert";
import * as yaml from "js-yaml";
import {
  ResourceCollection,
  Service,
  ConfigMap,
  Deployment,
  Namespace,
  V1ServicemonitorResource,
  withPodAntiAffinityRequired,
  StatefulSet,
  PersistentVolumeClaim,
  ServiceAccount
} from "@opstrace/kubernetes";
import { State } from "../../reducer";
import {
  roundDownToOdd,
  select,
  getBucketName,
  min,
  roundDown
} from "@opstrace/utils";
import {
  deepMerge,
  getControllerConfig,
  getControllerLokiConfigOverrides,
  getNodeCount
} from "../../helpers";
import { DockerImages, getImagePullSecrets } from "@opstrace/controller-config";
import { log } from "@opstrace/utils";

export function LokiResources(
  state: State,
  kubeConfig: KubeConfig,
  namespace: string
): ResourceCollection {
  const collection = new ResourceCollection();
  const { infrastructureName, target, region, gcp, logRetentionDays } =
    getControllerConfig(state);

  const dataBucketName = getBucketName({
    clusterName: infrastructureName,
    suffix: "loki"
  });
  const configBucketName = getBucketName({
    clusterName: infrastructureName,
    suffix: "loki-config"
  });
  const clusterName = infrastructureName;

  const deploymentConfig = {
    ruler: {
      resources: {},
      replicas: select(getNodeCount(state), [
        {
          "<=": 5,
          choose: 2
        },
        {
          "<=": Infinity,
          choose: 3
        }
      ])
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
      replicas: select(getNodeCount(state), [
        {
          "<=": 4,
          choose: 3
        },
        {
          "<=": 6,
          choose: 5
        },
        {
          "<=": 8,
          choose: 7
        },
        {
          "<=": 10,
          choose: 9
        },
        {
          "<=": Infinity,
          choose: roundDownToOdd(getNodeCount(state) / 2)
        }
      ])
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
          "<=": 4,
          choose: 3
        },
        {
          "<=": 6,
          choose: 5
        },
        {
          "<=": 8,
          choose: 7
        },
        {
          "<=": 10,
          choose: 9
        },
        {
          "<=": Infinity,
          choose: roundDownToOdd(getNodeCount(state) / 2)
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
          "<=": 6,
          choose: 3
        },
        {
          "<=": 9,
          choose: 5
        },
        {
          "<=": Infinity,
          choose: roundDownToOdd(getNodeCount(state) / 2)
        }
      ])
    },
    queryFrontend: {
      // more than 2 is not beneficial (less advantage of queueing requests in
      // front of queriers)
      replicas: 2
    },

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
    env: []
  };

  const memberlist_bind_port = 7947;
  const grpc_server_max_msg_size = 41943040; // default (4 MB) * 10

  const lokiDefaultConfig = {
    server: {
      http_listen_port: 1080,
      grpc_server_max_recv_msg_size: grpc_server_max_msg_size,
      grpc_server_max_send_msg_size: grpc_server_max_msg_size,
      // https://github.com/grafana/loki/pull/4182/files
      grpc_server_max_concurrent_streams: 1000,
      grpc_server_ping_without_stream_allowed: true,
      grpc_server_min_time_between_pings: "10s"
    },
    auth_enabled: true,
    chunk_store_config: {
      chunk_cache_config: {
        background: {
          writeback_buffer: 5000
        },
        memcached_client: {
          consistent_hash: true,
          host: `memcached.${namespace}.svc.cluster.local`,
          service: "memcached-client"
        }
      }
    },
    limits_config: {
      enforce_metric_name: false,
      ingestion_rate_mb: 500,
      ingestion_burst_size_mb: 2000,
      // enforced in querier
      max_entries_limit_per_query: 60000, // Per-tenant entry limit per query
      // https://github.com/grafana/loki/blob/main/production/ksonnet/loki/config.libsonnet#L190-L198
      reject_old_samples: true,
      reject_old_samples_max_age: "168h",
      max_query_length: `${(logRetentionDays + 1) * 24}h`,
      max_query_parallelism: 16,
      max_streams_per_user: 0, // Disabled in favor of the global limit
      max_global_streams_per_user: 10000, // 10k
      ingestion_rate_strategy: "global",
      max_cache_freshness_per_query: "10m"
    },
    frontend: {
      compress_responses: true,
      tail_proxy_url: `http://querier.${namespace}.svc.cluster.local:1080`
    },
    // The frontend_worker_config configures the worker - running within
    // the Loki querier - picking up and executing queries enqueued by
    // the query-frontend.
    frontend_worker: {
      frontend_address: `query-frontend.${namespace}.svc.cluster.local:9095`,
      grpc_client_config: {
        // Fix opstrace-prelaunch/issues/1289
        // Enable backoff and retry when a rate limit is hit.
        backoff_on_ratelimits: true,
        // https://github.com/grafana/loki/blob/main/production/ksonnet/loki/config.libsonnet#L156
        max_send_msg_size: grpc_server_max_msg_size
      }
    },
    // https://github.com/grafana/loki/blob/main/production/ksonnet/loki/config.libsonnet#L160-L175
    query_range: {
      split_queries_by_interval: "30m",
      align_queries_with_step: true,
      cache_results: true,
      max_retries: 5,
      results_cache: {
        cache: {
          memcached_client: {
            timeout: "500ms",
            consistent_hash: true,
            service: "memcached-client",
            host: `memcached-results.${namespace}.svc.cluster.local`,
            update_interval: "1m",
            max_idle_conns: 16
          }
        }
      }
    },
    // https://github.com/grafana/loki/blob/main/production/ksonnet/loki/config.libsonnet#L179-L181
    querier: {
      query_ingesters_within: "4h" // twice the max-chunk age for safety buffer
    },
    ingester: {
      chunk_retain_period: "5m", // default: 15m. How long to keep in mem after flush.
      chunk_target_size: 2000000, // ~2 MB (compressed). Flush criterion 1. For high-throughput log streams.
      max_chunk_age: "2h", // default: 1h. Flush criterion 2. Time window of timestamps in log entries.
      chunk_idle_period: "2h", // Flush criterion 3. Inactivity from Loki's point of view.
      max_returned_stream_errors: 25, // default: 10
      //
      // Enabling wal requires setting this to 0 (zero). Otherwise ingesters
      // fail to start with this error message:
      //
      // caller=main.go:87 msg="validating config" err="invalid ingester config:
      // the use of the write ahead log (WAL) is incompatible with chunk
      // transfers. It's suggested to use the WAL. Please try setting
      // ingester.max-transfer-retries to 0 to disable transfers"
      //
      max_transfer_retries: 0,
      wal: {
        enabled: true,
        // Directory where the WAL data should be stored and/or recovered from.
        // Should point to a directory in the attached volume which is mounted
        // at "/loki".
        dir: "/loki/wal",
        // Maximum memory size the WAL may use during replay. After hitting this
        // it will flush data to storage before continuing. A unit suffix (KB,
        // MB, GB) may be applied.
        //
        // Default is 4GB. We set a lower value to have a faster process
        // bootstrap and especially to reduce memory usage because we also run
        // cortex ingesters on the same nodes and want to reduce the chances of
        // a OOM.
        replay_memory_ceiling: "1GB"
      },
      lifecycler: {
        join_after: "30s",
        observe_period: "30s",
        num_tokens: 512,
        ring: {
          kvstore: {
            store: "memberlist"
          }
        }
      }
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
      bind_port: memberlist_bind_port,
      join_members: [
        // use a kubernetes headless service for all distributor, ingester and
        // querier components
        `loki-gossip-ring.${namespace}.svc.cluster.local:${memberlist_bind_port}`
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
    ruler: {
      enable_api: true,
      alertmanager_url: `http://alertmanager.cortex.svc.cluster.local/alertmanager/`,
      enable_sharding: true,
      enable_alertmanager_v2: true,
      rule_path: "/tmp/rules",
      ring: {
        kvstore: {
          store: "memberlist"
        }
      },
      storage: {
        type: target === "gcp" ? "gcs" : "s3",
        gcs: {
          bucket_name: configBucketName
        },
        s3: {
          s3: `s3://${region}/${configBucketName}`
        }
      }
    },
    storage_config: {
      boltdb_shipper: {
        active_index_directory: "/loki/index",
        shared_store: target === "gcp" ? "gcs" : "s3",
        cache_location: "/loki/boltdb-cache"
      },
      gcs: {
        bucket_name: dataBucketName
      },
      aws: {
        s3: `s3://${region}/${dataBucketName}`
      },
      index_queries_cache_config: {
        memcached_client: {
          consistent_hash: true,
          host: `memcached-index-queries.${namespace}.svc.cluster.local`,
          service: "memcached-client"
        }
      }
    }
  };

  const lokiConfigOverrides = getControllerLokiConfigOverrides(state);

  log.debug(
    `loki config overrides: ${JSON.stringify(lokiConfigOverrides, null, 2)}`
  );

  const lokiConfig = deepMerge(lokiDefaultConfig, lokiConfigOverrides);

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
    assert(gcp?.lokiServiceAccount);
    annotations = {
      "iam.gke.io/gcp-service-account": gcp.lokiServiceAccount
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
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: 1080 as any
            },
            {
              name: "querier-grpc",
              port: 9095,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
              port: memberlist_bind_port,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: memberlist_bind_port as any
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
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: 1080 as any
            },
            {
              name: "distributor-grpc",
              port: 9095,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: 1080 as any
            },
            {
              name: "ingester-grpc",
              port: 9095,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: 1080 as any
            },
            {
              name: "compactor-grpc",
              port: 9095,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
              imagePullSecrets: getImagePullSecrets(),
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
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
              imagePullSecrets: getImagePullSecrets(),
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
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
              // https://cortexmetrics.io/docs/guides/running-cortex-on-kubernetes/#take-extra-care-with-ingesters
              // The link is for cortex ingesters but loki ingesters share the
              // same architecture.
              terminationGracePeriodSeconds: 2400,
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
          strategy: {
            type: "Recreate"
          },
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
              imagePullSecrets: getImagePullSecrets(),
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
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      port: 1080 as any,
                      scheme: "HTTP"
                    },
                    initialDelaySeconds: 45,
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
    new Service(
      {
        apiVersion: "v1",
        kind: "Service",
        metadata: {
          labels: {
            job: `${namespace}.ruler`,
            name: "ruler"
          },
          name: "ruler",
          namespace
        },
        spec: {
          ports: [
            {
              name: "ruler-http-metrics",
              port: 1080,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: 1080 as any
            },
            {
              name: "ruler-grpc",
              port: 9095,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: 9095 as any
            }
          ],
          selector: {
            name: "ruler"
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
          name: "ruler",
          namespace
        },
        spec: {
          serviceName: "ruler",
          replicas: deploymentConfig.ruler.replicas,
          revisionHistoryLimit: 10,
          podManagementPolicy: "Parallel",
          selector: {
            matchLabels: {
              name: "ruler",
              memberlist: "loki-gossip-ring"
            }
          },
          template: {
            metadata: {
              labels: {
                name: "ruler",
                memberlist: "loki-gossip-ring"
              }
            },
            spec: {
              imagePullSecrets: getImagePullSecrets(),
              affinity: withPodAntiAffinityRequired({
                name: "ruler"
              }),
              containers: [
                {
                  args: ["-config.file=/etc/loki/config.yaml", "-target=ruler"],

                  env: deploymentConfig.env,
                  image: DockerImages.loki,
                  imagePullPolicy: "IfNotPresent",
                  name: "ruler",
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
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      port: 1080 as any,
                      scheme: "HTTP"
                    },
                    initialDelaySeconds: 45,
                    timeoutSeconds: 1,
                    periodSeconds: 10,
                    successThreshold: 1,
                    failureThreshold: 3
                  },

                  resources: deploymentConfig.ruler.resources,
                  volumeMounts: [
                    {
                      mountPath: "/etc/loki",
                      name: "loki"
                    },
                    {
                      name: "ruler-data",
                      mountPath: "/data"
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
                  name: "ruler-data",
                  persistentVolumeClaim: {
                    claimName: "ruler-data"
                  }
                }
              ]
            }
          },
          volumeClaimTemplates: [
            {
              metadata: {
                name: "ruler-data"
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
              imagePullSecrets: getImagePullSecrets(),
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
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      port: 1080 as any,
                      scheme: "HTTP"
                    },
                    initialDelaySeconds: 45,
                    timeoutSeconds: 1,
                    periodSeconds: 10,
                    successThreshold: 1,
                    failureThreshold: 3
                  },
                  //
                  // From https://github.com/grafana/loki/issues/3085. The
                  // queriers initialize the storage credentials in the query
                  // evaluation code path. To ensure the querier is initialized
                  // before being marked ready to receive requests we query the
                  // labels endpoint in the system tenant until we get a 200 OK.
                  // The system tenant is created by default. This means the
                  // queriers startupProbe waits for the ingesters to receive
                  // some data.
                  //
                  // The startupProbe indicates whether the application within
                  // the container is started. All other probes are disabled if
                  // a startup probe is provided, until it succeeds. The
                  // readinessProbe indicates whether the container is ready to
                  // respond to requests. If the readiness probe fails, teh
                  // endpoints controller removes the Pod's IP address from the
                  // endpoints of all Services that match the Pod.
                  //
                  // https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
                  // https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#define-startup-probes
                  //
                  startupProbe: {
                    httpGet: {
                      path: "/loki/api/v1/labels",
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      port: 1080 as any,
                      httpHeaders: [
                        {
                          name: "X-Scope-OrgID",
                          value: "system"
                        }
                      ]
                    },
                    // We are being liberal with these settings to cover a worst
                    // case startup time.
                    initialDelaySeconds: 90,
                    timeoutSeconds: 30,
                    periodSeconds: 10,
                    successThreshold: 1,
                    failureThreshold: 10
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
                      containerPort: 1080,
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

  return collection;
}
