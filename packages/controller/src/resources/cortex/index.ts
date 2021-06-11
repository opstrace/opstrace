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
import { strict as assert } from "assert";
import {
  getBucketName,
  min,
  roundDown,
  roundDownToOdd,
  select
} from "@opstrace/utils";
import { State } from "../../reducer";
import { getNodeCount, getControllerConfig } from "../../helpers";
import { KubeConfig } from "@kubernetes/client-node";
import {
  Deployment,
  Namespace,
  ResourceCollection,
  Service,
  ServiceAccount,
  V1Alpha1CortexResource,
  V1ServicemonitorResource,
  withPodAntiAffinityRequired
} from "@opstrace/kubernetes";
import { DockerImages } from "@opstrace/controller-config";

export function CortexResources(
  state: State,
  kubeConfig: KubeConfig,
  namespace: string
): ResourceCollection {
  const collection = new ResourceCollection();

  const {
    target,
    gcp,
    region,
    infrastructureName,
    metricRetentionDays
  } = getControllerConfig(state);

  const dataBucketName = getBucketName({
    clusterName: infrastructureName,
    suffix: "cortex"
  });
  const configBucketName = getBucketName({
    clusterName: infrastructureName,
    suffix: "cortex-config"
  });

  const bucketRegion = `s3.${region}.amazonaws.com`;

  const configsDBName = "cortex";
  const dbconfig = new URL(state.config.config?.postgreSQLEndpoint || "");
  const dbURL = urlJoin(state.config.config?.postgreSQLEndpoint, configsDBName);

  const config = {
    memcached: {
      replicas: select(getNodeCount(state), [
        { "<=": 5, choose: 2 },
        { "<=": 9, choose: 3 },
        {
          "<=": Infinity,
          choose: min(4, roundDown(getNodeCount(state) / 3))
        }
      ]),
      max_item_size: "2m",
      memory_limit: 4096,
      resources: {}
    },
    storegateway: {
      resources: {},
      replicas: select(getNodeCount(state), [
        {
          "<=": 6,
          choose: 3
        },
        {
          "<=": Infinity,
          choose: roundDownToOdd(getNodeCount(state) / 2)
        }
      ])
    },
    compactor: {
      resources: {},
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
    querier: {
      resources: {},
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
      replicas: 2 // more than 2 is not beneficial (less advantage of queuing requests in front of queriers)
    },
    configs: {
      replicas: 1 // start with 1, see how it goes
    },
    ruler: {
      replicas: 3
    },
    alertmanager: {
      replicas: 3
    },
    distributor: {
      resources: {},
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
    gateway: {
      replicas: select(getNodeCount(state), [
        { "<=": 4, choose: 2 },
        { "<=": 8, choose: 3 },
        { "<=": Infinity, choose: 5 }
      ])
    },
    ingester: {
      resources: {},
      replicas: select(getNodeCount(state), [
        {
          "<=": 20,
          // From 3 to 20 nodes, run ~Nnodes ingesters
          // Keeping replicas odd to reduce risk of ring contention
          // Example: 5 nodes => 5 ingesters, 6 nodes => 5 ingesters, 7 nodes => 7 ingesters
          choose: roundDownToOdd(getNodeCount(state))
        },
        {
          "<=": 42,
          // From 21 to 42 nodes, stay with 21 ingesters.
          // This ensures a smooth transition from replicas=Nnodes to replicas=Nnodes/2,
          // without the number of ingesters dropping as the nodes increase.
          choose: 21
        },
        {
          "<=": Infinity,
          // Above 42 nodes, run ~Nnodes/2 ingesters
          // NOTE: At this scale, its unknown if Nnodes/2 is reasonable.
          choose: roundDownToOdd(getNodeCount(state) / 2)
        }
      ])
    },
    env: []
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
  if (target === "gcp") {
    assert(gcp?.cortexServiceAccount);
    annotations = {
      "iam.gke.io/gcp-service-account": gcp.cortexServiceAccount
    };

    // TODO(sreis): check if adding these annotations are not overwritten by the
    // cortex-operator
    collection.add(
      new ServiceAccount(
        {
          apiVersion: "v1",
          kind: "ServiceAccount",
          metadata: {
            name: "cortex",
            namespace,
            annotations: annotations
          }
        },
        kubeConfig
      )
    );
  }

  collection.add(
    new V1Alpha1CortexResource(
      {
        apiVersion: "cortex.opstrace.io/v1alpha1",
        kind: "Cortex",
        metadata: {
          name: "opstrace-cortex",
          namespace: namespace
        },
        spec: {
          image: DockerImages.cortex,
          ingester_spec: {
            replicas: config.ingester.replicas,
            storage_class_name: "pd-ssd",
            datadir_size: "30Gi"
          },
          compactor_spec: {
            replicas: config.compactor.replicas,
            storage_class_name: "pd-ssd",
            datadir_size: "30Gi"
          },
          store_gateway_spec: {
            replicas: config.storegateway.replicas,
            storage_class_name: "pd-ssd",
            datadir_size: "30Gi"
          },
          distributor_spec: {
            replicas: config.distributor.replicas
          },
          query_frontend_spec: {
            replicas: config.queryFrontend.replicas
          },
          querier_spec: {
            replicas: config.querier.replicas
          },
          alertmanager_spec: {
            replicas: config.alertmanager.replicas
          },
          ruler_spec: {
            replicas: config.ruler.replicas
          },
          memcached: {
            image: DockerImages.memcached,
            chunks_cache_spec: {
              replicas: config.memcached.replicas,
              max_item_size: config.memcached.max_item_size,
              memory_limit: config.memcached.memory_limit
            },
            metadata_cache_spec: {
              replicas: config.memcached.replicas,
              max_item_size: config.memcached.max_item_size,
              memory_limit: config.memcached.memory_limit
            },
            index_queries_cache_spec: {
              replicas: config.memcached.replicas,
              max_item_size: config.memcached.max_item_size,
              memory_limit: config.memcached.memory_limit
            },
            index_writes_cache_spec: {
              replicas: config.memcached.replicas,
              max_item_size: config.memcached.max_item_size,
              memory_limit: config.memcached.memory_limit
            },
            results_cache_spec: {
              replicas: config.memcached.replicas,
              max_item_size: config.memcached.max_item_size,
              memory_limit: config.memcached.memory_limit
            }
          },
          config: {
            server: {
              grpc_server_max_recv_msg_size: 41943040, // default (4 MB) * 10
              grpc_server_max_send_msg_size: 41943040 // default (4 MB) * 10
            },
            memberlist: {
              max_join_backoff: "1m",
              max_join_retries: 20,
              min_join_backoff: "1s"
            },
            query_range: {
              split_queries_by_interval: "24h"
            },
            limits: {
              compactor_blocks_retention_period: `${(metricRetentionDays + 1) * 24}h`,
              // Define the sample ingestion rate, enforced in the individual
              // distributor. The idea is that this limit is applied locally,
              // see "ingestion_rate_strategy" below.
              ingestion_rate: 100000,
              // The default strategy is 'local', i.e. the effective limit can be
              // determined by multiplying with the number of distributors at hand.
              ingestion_rate_strategy: "local",
              // Per-user allowed ingestion burst size (in number of samples).
              ingestion_burst_size: 200000,
              // The maximum number of active series per user, across the cluster.
              // Supported only if -distributor.shard-by-all-labels is true (which
              // we set, above).
              max_global_series_per_user: 10000000,
              // The maximum number of active series per user, per ingester. As this
              // conflicts with `max_global_series_per_user`, set this so that it hits
              // in _later_ when ingesters are evenly loaded. Assume at least 3
              // ingesters. That is, set this to max_global_series_per_user / 2
              max_series_per_user: 5000000,
              accept_ha_samples: true,
              ha_cluster_label: "prometheus",
              ha_replica_label: "prometheus_replica",
              ruler_tenant_shard_size: 3
            },
            ingester: {
              lifecycler: {
                join_after: "30s",
                observe_period: "30s",
                num_tokens: 512
              },
              // Enable tracking of active series and export them as metrics.
              // Enables the metric `cortex_ingester_active_series`, resolving per
              // tenant ("user").
              active_series_metrics_enabled: true,
              active_series_metrics_update_period: "1m",
              // After what time a series is considered to be inactive.
              active_series_metrics_idle_timeout: "10m",
            },
            distributor: {
              instance_limits: {
                // Global push requests per distributor pod.
                // By default this is unlimited, and setting it reduces the risk of distributor OOMs under heavy load.
                // If this limit is reached then the distributor will reject requests.
                // This was observed when sending metric data with thousands or tens of thousands of labels.
                // In practice the inflight requests should be <5 territory, even when ingesters are falling behind.
                // See also the identically named limit for ingester pods.
                max_inflight_push_requests: 50
              }
            },
            blocks_storage: {
              tsdb: {
                // Note list_of_durations type, and e.g. "2h0m0s" does not validate as a single value
                // "2h0m0s," also does not. How to provide a list with a single value?
                // block_ranges_period: "2h0m0s,", //default
                retention_period: "6h"
              },
              backend: "s3",
              s3: {
                bucket_name: dataBucketName,
                endpoint: bucketRegion
              }
            },
            configs: {
              database: {
                uri: dbURL,
                migrations_dir: "/migrations"
              }
            },
            alertmanager_storage: {
              backend: "s3",
              s3: {
                bucket_name: configBucketName,
                endpoint: bucketRegion
              }
            },
            ruler_storage: {
              backend: "s3",
              s3: {
                bucket_name: configBucketName,
                endpoint: bucketRegion
              }
            }
          },
          runtime_config: {
            ingester_limits: {
              // The maximum number of global inflight requests per ingester
              // pod. By default this is unlimited, which risks ingesters OOMing
              // under heavy load. If the limit is reached, the ingester will
              // reject requests, but it keeps the ingester safe. This has been
              // observed when hundreds of thousands or millions of new metric
              // series are being added into cortex, where ingester pods can be
              // bogged down with initializing storage for those new series. In
              // theory this limit could be scaled according to the available
              // RAM on the nodes, but in practice the actual value here isn't
              // super important: if the ingester starts to fall behind then
              // queued requests will generally go from near-zero to
              // stratospheric levels within a few seconds, so there isn't much
              // difference between a 1k or 10k limit. See also the identically
              // named limit for distributor pods.
              max_inflight_push_requests: 1000
            }
          },
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
            name: "memcached-metadata",
            tenant: "system"
          },
          name: "memcached-metadata",
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
              name: "memcached-metadata"
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
            name: "memcached-metadata",
            tenant: "system"
          },
          name: "memcached-metadata",
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
              name: "memcached-metadata"
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
            name: "memcached-index-writes",
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
              name: "distributor"
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
              name: "ingester"
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
            name: "store-gateway",
            tenant: "system"
          },
          name: "store-gateway",
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
              name: "store-gateway"
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
              name: "compactor"
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
              name: "querier"
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
    new Deployment(
      {
        apiVersion: "apps/v1",
        kind: "Deployment",
        metadata: {
          name: "configs",
          namespace
        },
        spec: {
          replicas: config.configs.replicas,
          selector: {
            matchLabels: {
              name: "configs"
            }
          },
          template: {
            metadata: {
              labels: {
                name: "configs"
              }
            },
            spec: {
              // TODO: handle image pull secrets
              // imagePullSecrets: getImagePullSecrets(),
              initContainers: [
                {
                  image: DockerImages.postgresClient,
                  name: "createcortexconfigsdb",
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
                    `echo "SELECT 'CREATE DATABASE ${configsDBName}' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${configsDBName}')\\gexec" | psql`
                  ]
                }
              ],
              affinity: withPodAntiAffinityRequired({
                name: "configs"
              }),
              containers: [
                {
                  name: "configs",
                  image: DockerImages.cortex,
                  imagePullPolicy: "IfNotPresent",
                  args: [
                    "-target=configs",
                    "-config.file=/etc/cortex/config.yaml"
                  ],
                  env: config.env,
                  ports: [
                    {
                      containerPort: 80,
                      name: "http"
                    }
                  ],
                  volumeMounts: [
                    {
                      mountPath: "/etc/cortex",
                      name: "cortex-config"
                    },
                    {
                      mountPath: "/etc/cortex-runtime-cfg",
                      name: "cortex-runtime-config"
                    }
                  ]
                }
              ],
              volumes: [
                {
                  configMap: {
                    name: "cortex-config"
                  },
                  name: "cortex-config"
                },
                {
                  configMap: {
                    name: "cortex-runtime-config"
                  },
                  name: "cortex-runtime-config"
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
            job: `${namespace}.configs`,
            name: "configs"
          },
          name: "configs",
          namespace
        },
        spec: {
          clusterIP: "None",
          ports: [
            {
              port: 80,
              name: "http"
            }
          ],
          selector: {
            name: "configs"
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
            name: "configs",
            tenant: "system"
          },
          name: "configs",
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
              name: "configs"
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
            name: "ruler",
            tenant: "system"
          },
          name: "ruler",
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
              name: "ruler"
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
            name: "alertmanager",
            tenant: "system"
          },
          name: "alertmanager",
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
              name: "alertmanager"
            }
          }
        }
      },
      kubeConfig
    )
  );

  return collection;
}
