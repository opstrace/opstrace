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
  V1PrometheusruleResource,
  withPodAntiAffinityRequired,
  StatefulSet,
  PersistentVolumeClaim,
  ServiceAccount
} from "@opstrace/kubernetes";
import { State } from "../../reducer";
import { roundDownToOdd, select, getBucketName } from "@opstrace/utils";
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

  const deploymentConfig = {
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
    env: []
  };

  const lokiConfig = {
    server: {
      http_listen_port: 1080,
      grpc_server_max_recv_msg_size: 41943040, // default (4 MB) * 10
      grpc_server_max_send_msg_size: 41943040 // default (4 MB) * 10
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
      max_entries_limit_per_query: 60000 // Per-tenant entry limit per query
    },
    //
    // TODO: remove when opstrace-prelaunch/issues/1802 is done
    //
    // The frontend_worker_config configures the worker - running within
    // the Loki querier - picking up and executing queries enqueued by
    // the query-frontend.
    //
    frontend_worker: {
      grpc_client_config: {
        // Fix opstrace-prelaunch/issues/1289
        // Enable backoff and retry when a rate limit is hit.
        backoff_on_ratelimits: true
      }
    },
    ingester: {
      chunk_retain_period: "5m", // default: 15m. How long to keep in mem after flush.
      chunk_target_size: 2000000, // ~2 MB (compressed). Flush criterion 1. For high-throughput log streams.
      max_chunk_age: "2h", // default: 1h. Flush criterion 2. Time window of timestamps in log entries.
      chunk_idle_period: "2h", // Flush criterion 3. Inactivity from Loki's point of view.
      max_returned_stream_errors: 25, // default: 10
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
              port: 7946,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
              // https://cortexmetrics.io/docs/guides/running-cortex-on-kubernetes/#take-extra-care-with-ingesters
              // The link is for cortex ingesters but loki ingesters share the same architecture.
              terminationGracePeriodSeconds: 2400,
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
