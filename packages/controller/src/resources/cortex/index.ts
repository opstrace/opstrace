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
import * as yaml from "js-yaml";
import { strict as assert } from "assert";
import { getBucketName, roundDownToOdd } from "@opstrace/utils";
import { State } from "../../reducer";
import {
  getNodeCount,
  getControllerConfig,
  getControllerCortexConfigOverrides,
  deepMerge
} from "../../helpers";
import { KubeConfig } from "@kubernetes/client-node";
import { min, roundDown, select } from "@opstrace/utils";
import {
  ConfigMap,
  Deployment,
  Namespace,
  ResourceCollection,
  Service,
  ServiceAccount,
  StatefulSet,
  V1ServicemonitorResource,
  withPodAntiAffinityRequired
} from "@opstrace/kubernetes";
import { DockerImages } from "@opstrace/controller-config";
import { log } from "@opstrace/utils";

export function CortexResources(
  state: State,
  kubeConfig: KubeConfig,
  namespace: string
): ResourceCollection {
  const collection = new ResourceCollection();
  const {
    infrastructureName,
    target,
    region,
    gcp,
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

  const configsDBName = "cortex";
  const dbconfig = new URL(state.config.config?.postgreSQLEndpoint || "");

  const config = {
    memcachedResults: {
      replicas: select(getNodeCount(state), [
        { "<=": 5, choose: 2 },
        { "<=": 9, choose: 3 },
        {
          "<=": Infinity,
          choose: min(4, roundDown(getNodeCount(state) / 3))
        }
      ]),
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
          "<=": 20,
          // TODO does rounding down to odd matter?
          choose: roundDownToOdd(getNodeCount(state))
        },
        {
          "<=": Infinity,
          // TODO reconsider whether dividing by 2 is the right thing
          choose: roundDownToOdd(getNodeCount(state) / 2)
        }
      ])
    },
    env: []
  };

  const storageBackend = target === "gcp" ? "gcs" : "s3";

  // can use `state.tenants.list.tenants` if we'd like to.
  // This is used in a configmap data value below.
  const runtimeConfigDefault = {
    overrides: {}
  };

  // Cortex config schema: https://cortexmetrics.io/docs/configuration/configuration-file/
  const cortexDefaultConfig = {
    // HTTP path prefix for Cortex API: default is /api/prom which we do not like
    // in front of e.g. /api/v1/query. Note that the "Prometheus API" is served
    // at api.prometheus_http_prefix which by default is /prometheus
    http_prefix: "",
    // Define a 'runtime config file' to set dynamic per-tenant config such as
    // rate limits.
    // https://cortexmetrics.io/docs/configuration/arguments/#runtime-configuration-file
    runtime_config: {
      period: "5s",
      file: "/etc/cortex-runtime-cfg/runtime-config.yaml"
    },
    api: {
      // Serve Alertmanager UI at this location, matching the path served by the tenant Ingresses.
      // This is the default but we call it out explicitly here.
      // SEE ALSO: resources/ingress/index.ts, and alertmanager.external_url and ruler.alertmanager_url below
      alertmanager_http_prefix: "/alertmanager",
      response_compression_enabled: true
    },
    auth_enabled: true,
    distributor: {
      // When set to true, this allows for setting the ingester limit
      // max_global_series_per_user
      shard_by_all_labels: true,
      pool: {
        health_check_ingesters: true
      },
      ha_tracker: {
        enable_ha_tracker: false
      }
    },
    server: {
      grpc_server_max_recv_msg_size: 41943040, // default (4 MB) * 10
      grpc_server_max_send_msg_size: 41943040 // default (4 MB) * 10
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
    querier: {
      batch_iterators: true,
      ingester_streaming: true,
      store_gateway_addresses: `store-gateway.${namespace}.svc.cluster.local:9095`
    },
    query_range: {
      split_queries_by_interval: "24h",
      align_queries_with_step: true,
      cache_results: true,
      results_cache: {
        cache: {
          memcached_client: {
            consistent_hash: true,
            host: `memcached-results.${namespace}.svc.cluster.local`,
            service: "memcached-client"
          }
        }
      }
    },
    frontend_worker: {
      frontend_address: `query-frontend.${namespace}.svc.cluster.local:9095`
    },
    // limits_config
    // https://cortexmetrics.io/docs/configuration/configuration-file/#limits-config
    limits: {
      // Delete blocks containing samples older than the specified retention
      // period. Default is 0 (disabled). Add one day as a buffer here to be
      // on the safe side. Note(JP): should this be the primary mechanism to
      // delete old data from the corresponding cloud storage bucket? Should
      // this replace the bucket lifecycle-based method?
      compactor_blocks_retention_period: `${(metricRetentionDays + 1) * 24}h`,
      // Define the sample ingestion rate, enfored in the individual
      // distributor. The idea is that this limit is applied locally, see
      // "ingestion_rate_strategy" below.
      ingestion_rate: 100000, // default: 25000
      // The default strategy is 'local', i.e. the effective limit can be
      // determined by multiplying with the number of distributors at hand.
      ingestion_rate_strategy: "local",
      // Per-user allowed ingestion burst size (in number of samples).
      ingestion_burst_size: 200000, // default: 50000
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
      // Enable tracking of active series and export them as metrics.
      // Enables the metric `cortex_ingester_active_series`, resolving per
      // tenant ("user").
      active_series_metrics_enabled: true,
      active_series_metrics_update_period: "1m",
      // After what time a series is considered to be inactive.
      active_series_metrics_idle_timeout: "10m",
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
    blocks_storage: {
      tsdb: {
        dir: "/cortex/tsdb",
        wal_compression_enabled: true,
        // Note list_of_durations type, and e.g. "2h0m0s" does not validate as a single value
        // "2h0m0s," also does not. How to provide a list with a single value?
        // block_ranges_period: "2h0m0s,", //default
        retention_period: "6h" //default
      },
      backend: storageBackend,
      bucket_store: {
        sync_dir: "/cortex/tsdb-sync",
        index_cache: {
          backend: "memcached",
          memcached: {
            addresses: `dnssrv+memcached-index-queries.${namespace}.svc.cluster.local:11211`
          }
        },
        chunks_cache: {
          backend: "memcached",
          memcached: {
            addresses: `dnssrv+memcached.${namespace}.svc.cluster.local:11211`
          }
        },
        metadata_cache: {
          backend: "memcached",
          memcached: {
            addresses: `dnssrv+memcached-metadata.${namespace}.svc.cluster.local:11211`
          }
        }
      },
      gcs: {
        bucket_name: dataBucketName
      },
      s3: {
        bucket_name: dataBucketName,
        endpoint: `s3.${region}.amazonaws.com`
      }
    },
    store_gateway: {
      sharding_enabled: true,
      sharding_ring: {
        kvstore: {
          store: "memberlist"
        }
      }
    },
    compactor: {
      data_dir: "/cortex/compactor",
      sharding_enabled: true,
      sharding_ring: {
        kvstore: {
          store: "memberlist"
        }
      }
    },
    purger: { enable: true },
    storage: {
      engine: "blocks"
    },
    configs: {
      database: {
        uri: urlJoin(state.config.config?.postgreSQLEndpoint, configsDBName),
        migrations_dir: "/migrations"
      }
    },

    alertmanager: {
      enable_api: true,
      cluster: {
        peers: `alertmanager.${namespace}.svc.cluster.local:9094`
      },
      sharding_enabled: true,
      sharding_ring: {
        kvstore: {
          store: "memberlist"
        }
      },
      // This is used by other prometheus components and must align with api.alertmanager_http_prefix and ruler.alertmanager_url
      external_url: "/alertmanager"
    },
    // Using the new thanos-based storage for alertmanager configs
    alertmanager_storage: {
      backend: storageBackend,
      gcs: {
        bucket_name: configBucketName
      },
      s3: {
        bucket_name: configBucketName,
        endpoint: `s3.${region}.amazonaws.com`
      }
    },

    ruler: {
      enable_api: true,
      enable_sharding: true,
      sharding_strategy: "shuffle-sharding",
      ring: {
        kvstore: {
          store: "memberlist"
        }
      },
      // Must align with api.alertmanager_http_prefix and alertmanager.external_url
      // (This version needs to include the alertmanager hostname to send alerts to)
      alertmanager_url: `http://alertmanager.${namespace}.svc.cluster.local/alertmanager/`
    },
    // Using the new thanos-based storage for rule configs
    ruler_storage: {
      backend: storageBackend,
      gcs: {
        bucket_name: configBucketName
      },
      s3: {
        bucket_name: configBucketName,
        endpoint: `s3.${region}.amazonaws.com`
      }
    }
  };

  const cortexConfigOverrides = getControllerCortexConfigOverrides(state);

  log.debug(
    `cortex config overrides:\n${JSON.stringify(
      cortexConfigOverrides,
      null,
      2
    )}`
  );

  const cortexConfig = deepMerge(cortexDefaultConfig, cortexConfigOverrides);
  // Note(JP) log the merged object?

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
    assert(gcp?.cortexServiceAccount);
    annotations = {
      "iam.gke.io/gcp-service-account": gcp.cortexServiceAccount
    };
    serviceAccountName = "cortex";
  }

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
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: 11211 as any
            },
            {
              name: "exporter-http-metrics",
              port: 9150,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    new StatefulSet(
      {
        apiVersion: "apps/v1",
        kind: "StatefulSet",
        metadata: {
          name: "memcached-results",
          namespace
        },
        spec: {
          replicas: config.memcachedResults.replicas,
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
                  resources: config.memcachedResults.resources
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
            name: "memcached-metadata"
          },
          name: "memcached-metadata",
          namespace
        },
        spec: {
          clusterIP: "None",
          ports: [
            {
              name: "memcached-client",
              port: 11211,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: 11211 as any
            },
            {
              name: "exporter-http-metrics",
              port: 9150,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: 9150 as any
            }
          ],
          selector: {
            name: "memcached-metadata"
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
    new StatefulSet(
      {
        apiVersion: "apps/v1",
        kind: "StatefulSet",
        metadata: {
          name: "memcached-metadata",
          namespace
        },
        spec: {
          replicas: config.memcachedResults.replicas,
          serviceName: "memcached-metadata",
          podManagementPolicy: "Parallel",
          selector: {
            matchLabels: {
              name: "memcached-metadata"
            }
          },
          template: {
            metadata: {
              labels: {
                name: "memcached-metadata"
              }
            },
            spec: {
              affinity: withPodAntiAffinityRequired({
                name: "memcached-metadata"
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
                  resources: config.memcachedResults.resources
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
            name: "memcached-metadata"
          },
          name: "memcached-metadata",
          namespace
        },
        spec: {
          clusterIP: "None",
          ports: [
            {
              name: "memcached-client",
              port: 11211,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: 11211 as any
            },
            {
              name: "exporter-http-metrics",
              port: 9150,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: 9150 as any
            }
          ],
          selector: {
            name: "memcached-metadata"
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
    new Service(
      {
        apiVersion: "v1",
        kind: "Service",
        metadata: {
          labels: {
            name: "memcached-index-writes"
          },
          name: "memcached-index-writes",
          namespace
        },
        spec: {
          clusterIP: "None",
          ports: [
            {
              name: "memcached-client",
              port: 11211,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: 11211 as any
            },
            {
              name: "exporter-http-metrics",
              port: 9150,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: 9150 as any
            }
          ],
          selector: {
            name: "memcached-index-writes"
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
    new ConfigMap(
      {
        apiVersion: "v1",
        data: {
          "config.yaml": yaml.safeDump(cortexConfig)
        },
        kind: "ConfigMap",
        metadata: {
          name: "cortex-config",
          namespace
        }
      },
      kubeConfig
    )
  );

  const rtccm = new ConfigMap(
    {
      apiVersion: "v1",
      data: {
        "runtime-config.yaml": yaml.safeDump(runtimeConfigDefault)
      },
      kind: "ConfigMap",
      metadata: {
        name: "cortex-runtime-config",
        namespace
      }
    },
    kubeConfig
  );

  // Set immutable: annotation-based custom convention, so that the Opstrace
  // controller will not delete/overwrite this config map when it detects
  // change. Note that the UI API implementation is expected to mutate this
  // config map.
  rtccm.setImmutable();
  collection.add(rtccm);

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
          replicas: config.distributor.replicas,
          selector: {
            matchLabels: {
              name: "distributor",
              memberlist: "loki-gossip-ring"
            }
          },
          template: {
            metadata: {
              labels: {
                name: "distributor",
                memberlist: "loki-gossip-ring"
              }
            },
            spec: {
              affinity: withPodAntiAffinityRequired({
                name: "distributor"
              }),
              containers: [
                {
                  name: "distributor",
                  image: DockerImages.cortex,
                  imagePullPolicy: "IfNotPresent",
                  args: [
                    "-target=distributor",
                    "-config.file=/etc/cortex/config.yaml"
                  ],
                  env: config.env,
                  ports: [
                    {
                      name: "http",
                      containerPort: 80
                    },
                    {
                      containerPort: 9095,
                      name: "grpc"
                    }
                  ],
                  resources: config.distributor.resources,
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
            job: `${namespace}.distributor`,
            name: "distributor"
          },
          name: "distributor",
          namespace
        },
        spec: {
          ports: [
            {
              port: 80,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: 80 as any,
              name: "http"
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
    new Service(
      {
        apiVersion: "v1",
        kind: "Service",
        metadata: {
          labels: {
            name: "ingester",
            job: `${namespace}.ingester`
          },
          name: "ingester",
          namespace
        },
        spec: {
          ports: [
            {
              port: 80,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: 80 as any,
              name: "http"
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

  // NOTE: We do not recommend configuring a liveness probe on ingesters - killing
  // them is a last resort and should not be left to a machine.
  // https://cortexmetrics.io/docs/guides/kubernetes/
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
          replicas: config.ingester.replicas,
          // Avoid circular dependency between ingester-X failing readiness checks due to ingester-Y being down.
          // In this situation, the StatefulSet will not deploy ingester-Y if the podManagementPolicy is OrderedReady.
          podManagementPolicy: "Parallel",
          selector: {
            matchLabels: {
              name: "ingester"
            }
          },
          template: {
            metadata: {
              labels: {
                name: "ingester"
              }
            },
            spec: {
              affinity: withPodAntiAffinityRequired({
                name: "ingester"
              }),
              containers: [
                {
                  name: "ingester",
                  image: DockerImages.cortex,
                  imagePullPolicy: "IfNotPresent",
                  args: [
                    "-target=ingester",
                    "-ingester.chunk-encoding=3",
                    "-config.file=/etc/cortex/config.yaml"
                  ],
                  env: config.env,
                  ports: [
                    {
                      name: "http",
                      containerPort: 80
                    },
                    {
                      containerPort: 9095,
                      name: "grpc"
                    }
                  ],
                  // https://github.com/cortexproject/cortex-helm-chart/blob/14ee59e7b3e8772f19a12ab16979e5143f51ae92/values.yaml#L250-L254
                  readinessProbe: {
                    httpGet: {
                      path: "/ready",
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      port: 80 as any,
                      scheme: "HTTP"
                    },
                    initialDelaySeconds: 45,
                    timeoutSeconds: 1,
                    periodSeconds: 10,
                    successThreshold: 1,
                    failureThreshold: 3
                  },
                  resources: config.ingester.resources,
                  volumeMounts: [
                    {
                      mountPath: "/etc/cortex",
                      name: "cortex-config"
                    },
                    {
                      name: "datadir",
                      mountPath: "/cortex"
                    },
                    {
                      mountPath: "/etc/cortex-runtime-cfg",
                      name: "cortex-runtime-config"
                    }
                  ]
                }
              ],
              serviceAccountName: serviceAccountName,
              // https://cortexmetrics.io/docs/guides/running-cortex-on-kubernetes/#take-extra-care-with-ingesters
              terminationGracePeriodSeconds: 2400,
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
                    storage: "30Gi"
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
    new Service(
      {
        apiVersion: "v1",
        kind: "Service",
        metadata: {
          labels: {
            job: `${namespace}.store-gateway`,
            name: "store-gateway"
          },
          name: "store-gateway",
          namespace
        },
        spec: {
          ports: [
            {
              port: 80,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: 80 as any,
              name: "http"
            },
            {
              name: "store-gateway-grpc",
              port: 9095,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: 9095 as any
            }
          ],
          selector: {
            name: "store-gateway"
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
          name: "store-gateway",
          namespace
        },
        spec: {
          serviceName: "store-gateway",
          replicas: config.storegateway.replicas,
          podManagementPolicy: "OrderedReady",
          selector: {
            matchLabels: {
              name: "store-gateway"
            }
          },
          template: {
            metadata: {
              labels: {
                name: "store-gateway"
              }
            },
            spec: {
              affinity: withPodAntiAffinityRequired({
                name: "store-gateway"
              }),
              containers: [
                {
                  name: "store-gateway",
                  image: DockerImages.cortex,
                  imagePullPolicy: "IfNotPresent",
                  args: [
                    "-target=store-gateway",
                    "-config.file=/etc/cortex/config.yaml"
                  ],
                  env: config.env,
                  ports: [
                    {
                      name: "http",
                      containerPort: 80
                    },
                    {
                      containerPort: 9095,
                      name: "grpc"
                    }
                  ],
                  resources: config.storegateway.resources,
                  volumeMounts: [
                    {
                      mountPath: "/etc/cortex",
                      name: "cortex-config"
                    },
                    {
                      name: "datadir",
                      mountPath: "/cortex"
                    },
                    {
                      mountPath: "/etc/cortex-runtime-cfg",
                      name: "cortex-runtime-config"
                    }
                  ]
                }
              ],
              serviceAccountName: serviceAccountName,
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
                    storage: "30Gi"
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
              port: 80,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: 80 as any,
              name: "http"
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
    new StatefulSet(
      {
        apiVersion: "apps/v1",
        kind: "StatefulSet",
        metadata: {
          name: "compactor",
          namespace
        },
        spec: {
          serviceName: "compactor",
          replicas: config.compactor.replicas,
          podManagementPolicy: "OrderedReady",
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
                  name: "compactor",
                  image: DockerImages.cortex,
                  imagePullPolicy: "IfNotPresent",
                  args: [
                    "-target=compactor",
                    "-config.file=/etc/cortex/config.yaml"
                  ],
                  env: config.env,
                  ports: [
                    {
                      name: "http",
                      containerPort: 80
                    },
                    {
                      containerPort: 9095,
                      name: "grpc"
                    }
                  ],
                  resources: config.compactor.resources,
                  volumeMounts: [
                    {
                      mountPath: "/etc/cortex",
                      name: "cortex-config"
                    },
                    {
                      name: "datadir",
                      mountPath: "/cortex"
                    },
                    {
                      mountPath: "/etc/cortex-runtime-cfg",
                      name: "cortex-runtime-config"
                    }
                  ]
                }
              ],
              serviceAccountName: serviceAccountName,
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
                    storage: "30Gi"
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
    new Deployment(
      {
        apiVersion: "apps/v1",
        kind: "Deployment",
        metadata: {
          name: "querier",
          namespace
        },
        spec: {
          replicas: config.querier.replicas,
          selector: {
            matchLabels: {
              name: "querier",
              // why 'loki' here?
              memberlist: "loki-gossip-ring"
            }
          },
          template: {
            metadata: {
              labels: {
                name: "querier",
                // why 'loki' here?
                memberlist: "loki-gossip-ring"
              }
            },
            spec: {
              affinity: withPodAntiAffinityRequired({
                name: "querier"
              }),
              containers: [
                {
                  name: "querier",
                  image: DockerImages.cortex,
                  imagePullPolicy: "IfNotPresent",
                  args: [
                    "-target=querier",
                    "-config.file=/etc/cortex/config.yaml"
                  ],
                  env: config.env,
                  ports: [
                    {
                      name: "http",
                      containerPort: 80
                    },
                    {
                      containerPort: 9095,
                      name: "grpc"
                    }
                  ],
                  resources: config.querier.resources,
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
              serviceAccountName: serviceAccountName,
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
            job: `${namespace}.querier`,
            name: "querier"
          },
          name: "querier",
          namespace
        },
        spec: {
          ports: [
            {
              port: 80,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: 80 as any,
              name: "http"
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
    new Deployment(
      {
        apiVersion: "apps/v1",
        kind: "Deployment",
        metadata: {
          name: "query-frontend",
          namespace
        },
        spec: {
          replicas: config.queryFrontend.replicas,
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
                  image: DockerImages.cortex,
                  imagePullPolicy: "IfNotPresent",
                  args: [
                    "-target=query-frontend",
                    "-config.file=/etc/cortex/config.yaml"
                  ],
                  env: config.env,
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
              port: 80,
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
    new Deployment(
      {
        apiVersion: "apps/v1",
        kind: "Deployment",
        metadata: {
          name: "ruler",
          namespace
        },
        spec: {
          replicas: config.ruler.replicas,
          selector: {
            matchLabels: {
              name: "ruler"
            }
          },
          template: {
            metadata: {
              labels: {
                name: "ruler"
              }
            },
            spec: {
              affinity: withPodAntiAffinityRequired({
                name: "ruler"
              }),
              containers: [
                {
                  name: "ruler",
                  image: DockerImages.cortex,
                  imagePullPolicy: "IfNotPresent",
                  args: [
                    "-target=ruler",
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
              // For access to config storage on GCP
              serviceAccountName: serviceAccountName,
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
            job: `${namespace}.ruler`,
            name: "ruler"
          },
          name: "ruler",
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
            name: "ruler"
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
    new Deployment(
      {
        apiVersion: "apps/v1",
        kind: "Deployment",
        metadata: {
          name: "alertmanager",
          namespace
        },
        spec: {
          replicas: config.alertmanager.replicas,
          selector: {
            matchLabels: {
              name: "alertmanager"
            }
          },
          template: {
            metadata: {
              labels: {
                name: "alertmanager"
              }
            },
            spec: {
              affinity: withPodAntiAffinityRequired({
                name: "alertmanager"
              }),
              containers: [
                {
                  name: "alertmanager",
                  image: DockerImages.cortex,
                  imagePullPolicy: "IfNotPresent",
                  args: [
                    "-target=alertmanager",
                    "-config.file=/etc/cortex/config.yaml",
                    // Avoid running legacy endpoints at "/*", which breaks "/api/v1/alerts" for submitting alertmanager configs.
                    // TODO remove this workaround after the cortex image has this fix: https://github.com/cortexproject/cortex/pull/3905
                    "-http.prefix=/api/legacy"
                  ],
                  env: config.env,
                  ports: [
                    {
                      containerPort: 9094,
                      name: "alertmanager"
                    },
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
              // For access to config storage on GCP
              serviceAccountName: serviceAccountName,
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
            job: `${namespace}.alertmanager`,
            name: "alertmanager"
          },
          name: "alertmanager",
          namespace
        },
        spec: {
          clusterIP: "None",
          ports: [
            {
              port: 9094,
              name: "cluster"
            },
            {
              port: 80,
              name: "http"
            }
          ],
          selector: {
            name: "alertmanager"
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
