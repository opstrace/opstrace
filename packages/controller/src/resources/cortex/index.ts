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
  V1PrometheusruleResource,
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
    name,
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

  // TODO centralize these URLs
  const runbookUrl =
    "https://github.com/opstrace/opstrace/blob/master/docs/alerts";

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
          "<=": Infinity,
          choose: roundDownToOdd(getNodeCount(state) / 2)
        }
      ])
    },
    env: []
  };

  const storageBackend = target === "gcp" ? "gcs" : "s3";

  // can use `state.tenants.list.tenants` if we'd like to.
  // Note(JP): Is this just the initial state? This is used in a configmap
  // data value below. Will the controller overwrite this configmap again
  // when mutated by a different entity?
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
      period: "10s",
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
      // Disabled for now. As of March 4 2021 this isn't ready yet per cortex team.
      sharding_enabled: false,
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

  collection.add(
    new V1PrometheusruleResource(
      {
        apiVersion: "monitoring.coreos.com/v1",
        kind: "PrometheusRule",
        metadata: {
          labels: {
            prometheus: "system-prometheus",
            role: "alert-rules",
            tenant: "system",
            stack_name: name
          },
          name: "cortex-prometheus-rules",
          namespace
        },
        spec: {
          groups: [
            {
              name: "cortex_rules",
              rules: [
                {
                  expr:
                    "histogram_quantile(0.99, sum(rate(cortex_request_duration_seconds_bucket[1m])) by (le, job))",
                  record: "job:cortex_request_duration_seconds:99quantile"
                },
                {
                  expr:
                    "histogram_quantile(0.50, sum(rate(cortex_request_duration_seconds_bucket[1m])) by (le, job))",
                  record: "job:cortex_request_duration_seconds:50quantile"
                },
                {
                  expr:
                    "sum(rate(cortex_request_duration_seconds_sum[1m])) by (job) / sum(rate(cortex_request_duration_seconds_count[1m])) by (job)",
                  record: "job:cortex_request_duration_seconds:avg"
                },
                {
                  expr:
                    "sum(rate(cortex_request_duration_seconds_bucket[1m])) by (le, job)",
                  record: "job:cortex_request_duration_seconds_bucket:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_request_duration_seconds_sum[1m])) by (job)",
                  record: "job:cortex_request_duration_seconds_sum:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_request_duration_seconds_count[1m])) by (job)",
                  record: "job:cortex_request_duration_seconds_count:sum_rate"
                },
                {
                  expr:
                    "histogram_quantile(0.99, sum(rate(cortex_request_duration_seconds_bucket[1m])) by (le, job, route))",
                  record: "job_route:cortex_request_duration_seconds:99quantile"
                },
                {
                  expr:
                    "histogram_quantile(0.50, sum(rate(cortex_request_duration_seconds_bucket[1m])) by (le, job, route))",
                  record: "job_route:cortex_request_duration_seconds:50quantile"
                },
                {
                  expr:
                    "sum(rate(cortex_request_duration_seconds_sum[1m])) by (job, route) / sum(rate(cortex_request_duration_seconds_count[1m])) by (job, route)",
                  record: "job_route:cortex_request_duration_seconds:avg"
                },
                {
                  expr:
                    "sum(rate(cortex_request_duration_seconds_bucket[1m])) by (le, job, route)",
                  record:
                    "job_route:cortex_request_duration_seconds_bucket:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_request_duration_seconds_sum[1m])) by (job, route)",
                  record:
                    "job_route:cortex_request_duration_seconds_sum:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_request_duration_seconds_count[1m])) by (job, route)",
                  record:
                    "job_route:cortex_request_duration_seconds_count:sum_rate"
                },
                {
                  expr:
                    "histogram_quantile(0.99, sum(rate(cortex_request_duration_seconds_bucket[1m])) by (le, namespace, job, route))",
                  record:
                    "namespace_job_route:cortex_request_duration_seconds:99quantile"
                },
                {
                  expr:
                    "histogram_quantile(0.50, sum(rate(cortex_request_duration_seconds_bucket[1m])) by (le, namespace, job, route))",
                  record:
                    "namespace_job_route:cortex_request_duration_seconds:50quantile"
                },
                {
                  expr:
                    "sum(rate(cortex_request_duration_seconds_sum[1m])) by (namespace, job, route) / sum(rate(cortex_request_duration_seconds_count[1m])) by (namespace, job, route)",
                  record:
                    "namespace_job_route:cortex_request_duration_seconds:avg"
                },
                {
                  expr:
                    "sum(rate(cortex_request_duration_seconds_bucket[1m])) by (le, namespace, job, route)",
                  record:
                    "namespace_job_route:cortex_request_duration_seconds_bucket:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_request_duration_seconds_sum[1m])) by (namespace, job, route)",
                  record:
                    "namespace_job_route:cortex_request_duration_seconds_sum:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_request_duration_seconds_count[1m])) by (namespace, job, route)",
                  record:
                    "namespace_job_route:cortex_request_duration_seconds_count:sum_rate"
                },
                {
                  expr:
                    "histogram_quantile(0.99, sum(rate(cortex_memcache_request_duration_seconds_bucket[1m])) by (le, job, method))",
                  record:
                    "job_method:cortex_memcache_request_duration_seconds:99quantile"
                },
                {
                  expr:
                    "histogram_quantile(0.50, sum(rate(cortex_memcache_request_duration_seconds_bucket[1m])) by (le, job, method))",
                  record:
                    "job_method:cortex_memcache_request_duration_seconds:50quantile"
                },
                {
                  expr:
                    "sum(rate(cortex_memcache_request_duration_seconds_sum[1m])) by (job, method) / sum(rate(cortex_memcache_request_duration_seconds_count[1m])) by (job, method)",
                  record:
                    "job_method:cortex_memcache_request_duration_seconds:avg"
                },
                {
                  expr:
                    "sum(rate(cortex_memcache_request_duration_seconds_bucket[1m])) by (le, job, method)",
                  record:
                    "job_method:cortex_memcache_request_duration_seconds_bucket:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_memcache_request_duration_seconds_sum[1m])) by (job, method)",
                  record:
                    "job_method:cortex_memcache_request_duration_seconds_sum:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_memcache_request_duration_seconds_count[1m])) by (job, method)",
                  record:
                    "job_method:cortex_memcache_request_duration_seconds_count:sum_rate"
                },
                {
                  expr:
                    "histogram_quantile(0.99, sum(rate(cortex_cache_request_duration_seconds_bucket[1m])) by (le, job))",
                  record: "job:cortex_cache_request_duration_seconds:99quantile"
                },
                {
                  expr:
                    "histogram_quantile(0.50, sum(rate(cortex_cache_request_duration_seconds_bucket[1m])) by (le, job))",
                  record: "job:cortex_cache_request_duration_seconds:50quantile"
                },
                {
                  expr:
                    "sum(rate(cortex_cache_request_duration_seconds_sum[1m])) by (job) / sum(rate(cortex_cache_request_duration_seconds_count[1m])) by (job)",
                  record: "job:cortex_cache_request_duration_seconds:avg"
                },
                {
                  expr:
                    "sum(rate(cortex_cache_request_duration_seconds_bucket[1m])) by (le, job)",
                  record:
                    "job:cortex_cache_request_duration_seconds_bucket:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_cache_request_duration_seconds_sum[1m])) by (job)",
                  record:
                    "job:cortex_cache_request_duration_seconds_sum:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_cache_request_duration_seconds_count[1m])) by (job)",
                  record:
                    "job:cortex_cache_request_duration_seconds_count:sum_rate"
                },
                {
                  expr:
                    "histogram_quantile(0.99, sum(rate(cortex_cache_request_duration_seconds_bucket[1m])) by (le, job, method))",
                  record:
                    "job_method:cortex_cache_request_duration_seconds:99quantile"
                },
                {
                  expr:
                    "histogram_quantile(0.50, sum(rate(cortex_cache_request_duration_seconds_bucket[1m])) by (le, job, method))",
                  record:
                    "job_method:cortex_cache_request_duration_seconds:50quantile"
                },
                {
                  expr:
                    "sum(rate(cortex_cache_request_duration_seconds_sum[1m])) by (job, method) / sum(rate(cortex_cache_request_duration_seconds_count[1m])) by (job, method)",
                  record: "job_method:cortex_cache_request_duration_seconds:avg"
                },
                {
                  expr:
                    "sum(rate(cortex_cache_request_duration_seconds_bucket[1m])) by (le, job, method)",
                  record:
                    "job_method:cortex_cache_request_duration_seconds_bucket:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_cache_request_duration_seconds_sum[1m])) by (job, method)",
                  record:
                    "job_method:cortex_cache_request_duration_seconds_sum:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_cache_request_duration_seconds_count[1m])) by (job, method)",
                  record:
                    "job_method:cortex_cache_request_duration_seconds_count:sum_rate"
                },
                {
                  expr:
                    "histogram_quantile(0.99, sum(rate(cortex_bigtable_request_duration_seconds_bucket[1m])) by (le, job, operation))",
                  record:
                    "job_operation:cortex_bigtable_request_duration_seconds:99quantile"
                },
                {
                  expr:
                    "histogram_quantile(0.50, sum(rate(cortex_bigtable_request_duration_seconds_bucket[1m])) by (le, job, operation))",
                  record:
                    "job_operation:cortex_bigtable_request_duration_seconds:50quantile"
                },
                {
                  expr:
                    "sum(rate(cortex_bigtable_request_duration_seconds_sum[1m])) by (job, operation) / sum(rate(cortex_bigtable_request_duration_seconds_count[1m])) by (job, operation)",
                  record:
                    "job_operation:cortex_bigtable_request_duration_seconds:avg"
                },
                {
                  expr:
                    "sum(rate(cortex_bigtable_request_duration_seconds_bucket[1m])) by (le, job, operation)",
                  record:
                    "job_operation:cortex_bigtable_request_duration_seconds_bucket:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_bigtable_request_duration_seconds_sum[1m])) by (job, operation)",
                  record:
                    "job_operation:cortex_bigtable_request_duration_seconds_sum:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_bigtable_request_duration_seconds_count[1m])) by (job, operation)",
                  record:
                    "job_operation:cortex_bigtable_request_duration_seconds_count:sum_rate"
                },
                {
                  expr:
                    "histogram_quantile(0.99, sum(rate(cortex_dynamo_request_duration_seconds_bucket[1m])) by (le, job, operation))",
                  record:
                    "job_operation:cortex_dynamo_request_duration_seconds:99quantile"
                },
                {
                  expr:
                    "histogram_quantile(0.50, sum(rate(cortex_dynamo_request_duration_seconds_bucket[1m])) by (le, job, operation))",
                  record:
                    "job_operation:cortex_dynamo_request_duration_seconds:50quantile"
                },
                {
                  expr:
                    "sum(rate(cortex_dynamo_request_duration_seconds_sum[1m])) by (job, operation) / sum(rate(cortex_dynamo_request_duration_seconds_count[1m])) by (job, operation)",
                  record:
                    "job_operation:cortex_dynamo_request_duration_seconds:avg"
                },
                {
                  expr:
                    "sum(rate(cortex_dynamo_request_duration_seconds_bucket[1m])) by (le, job, operation)",
                  record:
                    "job_operation:cortex_dynamo_request_duration_seconds_bucket:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_dynamo_request_duration_seconds_sum[1m])) by (job, operation)",
                  record:
                    "job_operation:cortex_dynamo_request_duration_seconds_sum:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_dynamo_request_duration_seconds_count[1m])) by (job, operation)",
                  record:
                    "job_operation:cortex_dynamo_request_duration_seconds_count:sum_rate"
                },
                {
                  expr:
                    "histogram_quantile(0.99, sum(rate(cortex_query_frontend_retries_bucket[1m])) by (le, job))",
                  record: "job:cortex_query_frontend_retries:99quantile"
                },
                {
                  expr:
                    "histogram_quantile(0.50, sum(rate(cortex_query_frontend_retries_bucket[1m])) by (le, job))",
                  record: "job:cortex_query_frontend_retries:50quantile"
                },
                {
                  expr:
                    "sum(rate(cortex_query_frontend_retries_sum[1m])) by (job) / sum(rate(cortex_query_frontend_retries_count[1m])) by (job)",
                  record: "job:cortex_query_frontend_retries:avg"
                },
                {
                  expr:
                    "sum(rate(cortex_query_frontend_retries_bucket[1m])) by (le, job)",
                  record: "job:cortex_query_frontend_retries_bucket:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_query_frontend_retries_sum[1m])) by (job)",
                  record: "job:cortex_query_frontend_retries_sum:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_query_frontend_retries_count[1m])) by (job)",
                  record: "job:cortex_query_frontend_retries_count:sum_rate"
                },
                {
                  expr:
                    "histogram_quantile(0.99, sum(rate(cortex_query_frontend_queue_duration_seconds_bucket[1m])) by (le, job))",
                  record:
                    "job:cortex_query_frontend_queue_duration_seconds:99quantile"
                },
                {
                  expr:
                    "histogram_quantile(0.50, sum(rate(cortex_query_frontend_queue_duration_seconds_bucket[1m])) by (le, job))",
                  record:
                    "job:cortex_query_frontend_queue_duration_seconds:50quantile"
                },
                {
                  expr:
                    "sum(rate(cortex_query_frontend_queue_duration_seconds_sum[1m])) by (job) / sum(rate(cortex_query_frontend_queue_duration_seconds_count[1m])) by (job)",
                  record: "job:cortex_query_frontend_queue_duration_seconds:avg"
                },
                {
                  expr:
                    "sum(rate(cortex_query_frontend_queue_duration_seconds_bucket[1m])) by (le, job)",
                  record:
                    "job:cortex_query_frontend_queue_duration_seconds_bucket:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_query_frontend_queue_duration_seconds_sum[1m])) by (job)",
                  record:
                    "job:cortex_query_frontend_queue_duration_seconds_sum:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_query_frontend_queue_duration_seconds_count[1m])) by (job)",
                  record:
                    "job:cortex_query_frontend_queue_duration_seconds_count:sum_rate"
                },
                {
                  expr:
                    "histogram_quantile(0.99, sum(rate(cortex_ingester_queried_series_bucket[1m])) by (le, job))",
                  record: "job:cortex_ingester_queried_series:99quantile"
                },
                {
                  expr:
                    "histogram_quantile(0.50, sum(rate(cortex_ingester_queried_series_bucket[1m])) by (le, job))",
                  record: "job:cortex_ingester_queried_series:50quantile"
                },
                {
                  expr:
                    "sum(rate(cortex_ingester_queried_series_sum[1m])) by (job) / sum(rate(cortex_ingester_queried_series_count[1m])) by (job)",
                  record: "job:cortex_ingester_queried_series:avg"
                },
                {
                  expr:
                    "sum(rate(cortex_ingester_queried_series_bucket[1m])) by (le, job)",
                  record: "job:cortex_ingester_queried_series_bucket:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_ingester_queried_series_sum[1m])) by (job)",
                  record: "job:cortex_ingester_queried_series_sum:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_ingester_queried_series_count[1m])) by (job)",
                  record: "job:cortex_ingester_queried_series_count:sum_rate"
                },
                {
                  expr:
                    "histogram_quantile(0.99, sum(rate(cortex_ingester_queried_chunks_bucket[1m])) by (le, job))",
                  record: "job:cortex_ingester_queried_chunks:99quantile"
                },
                {
                  expr:
                    "histogram_quantile(0.50, sum(rate(cortex_ingester_queried_chunks_bucket[1m])) by (le, job))",
                  record: "job:cortex_ingester_queried_chunks:50quantile"
                },
                {
                  expr:
                    "sum(rate(cortex_ingester_queried_chunks_sum[1m])) by (job) / sum(rate(cortex_ingester_queried_chunks_count[1m])) by (job)",
                  record: "job:cortex_ingester_queried_chunks:avg"
                },
                {
                  expr:
                    "sum(rate(cortex_ingester_queried_chunks_bucket[1m])) by (le, job)",
                  record: "job:cortex_ingester_queried_chunks_bucket:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_ingester_queried_chunks_sum[1m])) by (job)",
                  record: "job:cortex_ingester_queried_chunks_sum:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_ingester_queried_chunks_count[1m])) by (job)",
                  record: "job:cortex_ingester_queried_chunks_count:sum_rate"
                },
                {
                  expr:
                    "histogram_quantile(0.99, sum(rate(cortex_ingester_queried_samples_bucket[1m])) by (le, job))",
                  record: "job:cortex_ingester_queried_samples:99quantile"
                },
                {
                  expr:
                    "histogram_quantile(0.50, sum(rate(cortex_ingester_queried_samples_bucket[1m])) by (le, job))",
                  record: "job:cortex_ingester_queried_samples:50quantile"
                },
                {
                  expr:
                    "sum(rate(cortex_ingester_queried_samples_sum[1m])) by (job) / sum(rate(cortex_ingester_queried_samples_count[1m])) by (job)",
                  record: "job:cortex_ingester_queried_samples:avg"
                },
                {
                  expr:
                    "sum(rate(cortex_ingester_queried_samples_bucket[1m])) by (le, job)",
                  record: "job:cortex_ingester_queried_samples_bucket:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_ingester_queried_samples_sum[1m])) by (job)",
                  record: "job:cortex_ingester_queried_samples_sum:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_ingester_queried_samples_count[1m])) by (job)",
                  record: "job:cortex_ingester_queried_samples_count:sum_rate"
                },
                {
                  expr:
                    "histogram_quantile(0.99, sum(rate(cortex_chunk_store_index_lookups_per_query_bucket[1m])) by (le, job))",
                  record:
                    "job:cortex_chunk_store_index_lookups_per_query:99quantile"
                },
                {
                  expr:
                    "histogram_quantile(0.50, sum(rate(cortex_chunk_store_index_lookups_per_query_bucket[1m])) by (le, job))",
                  record:
                    "job:cortex_chunk_store_index_lookups_per_query:50quantile"
                },
                {
                  expr:
                    "sum(rate(cortex_chunk_store_index_lookups_per_query_sum[1m])) by (job) / sum(rate(cortex_chunk_store_index_lookups_per_query_count[1m])) by (job)",
                  record: "job:cortex_chunk_store_index_lookups_per_query:avg"
                },
                {
                  expr:
                    "sum(rate(cortex_chunk_store_index_lookups_per_query_bucket[1m])) by (le, job)",
                  record:
                    "job:cortex_chunk_store_index_lookups_per_query_bucket:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_chunk_store_index_lookups_per_query_sum[1m])) by (job)",
                  record:
                    "job:cortex_chunk_store_index_lookups_per_query_sum:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_chunk_store_index_lookups_per_query_count[1m])) by (job)",
                  record:
                    "job:cortex_chunk_store_index_lookups_per_query_count:sum_rate"
                },
                {
                  expr:
                    "histogram_quantile(0.99, sum(rate(cortex_chunk_store_series_pre_intersection_per_query_bucket[1m])) by (le, job))",
                  record:
                    "job:cortex_chunk_store_series_pre_intersection_per_query:99quantile"
                },
                {
                  expr:
                    "histogram_quantile(0.50, sum(rate(cortex_chunk_store_series_pre_intersection_per_query_bucket[1m])) by (le, job))",
                  record:
                    "job:cortex_chunk_store_series_pre_intersection_per_query:50quantile"
                },
                {
                  expr:
                    "sum(rate(cortex_chunk_store_series_pre_intersection_per_query_sum[1m])) by (job) / sum(rate(cortex_chunk_store_series_pre_intersection_per_query_count[1m])) by (job)",
                  record:
                    "job:cortex_chunk_store_series_pre_intersection_per_query:avg"
                },
                {
                  expr:
                    "sum(rate(cortex_chunk_store_series_pre_intersection_per_query_bucket[1m])) by (le, job)",
                  record:
                    "job:cortex_chunk_store_series_pre_intersection_per_query_bucket:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_chunk_store_series_pre_intersection_per_query_sum[1m])) by (job)",
                  record:
                    "job:cortex_chunk_store_series_pre_intersection_per_query_sum:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_chunk_store_series_pre_intersection_per_query_count[1m])) by (job)",
                  record:
                    "job:cortex_chunk_store_series_pre_intersection_per_query_count:sum_rate"
                },
                {
                  expr:
                    "histogram_quantile(0.99, sum(rate(cortex_chunk_store_series_post_intersection_per_query_bucket[1m])) by (le, job))",
                  record:
                    "job:cortex_chunk_store_series_post_intersection_per_query:99quantile"
                },
                {
                  expr:
                    "histogram_quantile(0.50, sum(rate(cortex_chunk_store_series_post_intersection_per_query_bucket[1m])) by (le, job))",
                  record:
                    "job:cortex_chunk_store_series_post_intersection_per_query:50quantile"
                },
                {
                  expr:
                    "sum(rate(cortex_chunk_store_series_post_intersection_per_query_sum[1m])) by (job) / sum(rate(cortex_chunk_store_series_post_intersection_per_query_count[1m])) by (job)",
                  record:
                    "job:cortex_chunk_store_series_post_intersection_per_query:avg"
                },
                {
                  expr:
                    "sum(rate(cortex_chunk_store_series_post_intersection_per_query_bucket[1m])) by (le, job)",
                  record:
                    "job:cortex_chunk_store_series_post_intersection_per_query_bucket:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_chunk_store_series_post_intersection_per_query_sum[1m])) by (job)",
                  record:
                    "job:cortex_chunk_store_series_post_intersection_per_query_sum:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_chunk_store_series_post_intersection_per_query_count[1m])) by (job)",
                  record:
                    "job:cortex_chunk_store_series_post_intersection_per_query_count:sum_rate"
                },
                {
                  expr:
                    "histogram_quantile(0.99, sum(rate(cortex_chunk_store_chunks_per_query_bucket[1m])) by (le, job))",
                  record: "job:cortex_chunk_store_chunks_per_query:99quantile"
                },
                {
                  expr:
                    "histogram_quantile(0.50, sum(rate(cortex_chunk_store_chunks_per_query_bucket[1m])) by (le, job))",
                  record: "job:cortex_chunk_store_chunks_per_query:50quantile"
                },
                {
                  expr:
                    "sum(rate(cortex_chunk_store_chunks_per_query_sum[1m])) by (job) / sum(rate(cortex_chunk_store_chunks_per_query_count[1m])) by (job)",
                  record: "job:cortex_chunk_store_chunks_per_query:avg"
                },
                {
                  expr:
                    "sum(rate(cortex_chunk_store_chunks_per_query_bucket[1m])) by (le, job)",
                  record:
                    "job:cortex_chunk_store_chunks_per_query_bucket:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_chunk_store_chunks_per_query_sum[1m])) by (job)",
                  record: "job:cortex_chunk_store_chunks_per_query_sum:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_chunk_store_chunks_per_query_count[1m])) by (job)",
                  record:
                    "job:cortex_chunk_store_chunks_per_query_count:sum_rate"
                },
                {
                  expr:
                    "histogram_quantile(0.99, sum(rate(cortex_database_request_duration_seconds_bucket[1m])) by (le, job, method))",
                  record:
                    "job_method:cortex_database_request_duration_seconds:99quantile"
                },
                {
                  expr:
                    "histogram_quantile(0.50, sum(rate(cortex_database_request_duration_seconds_bucket[1m])) by (le, job, method))",
                  record:
                    "job_method:cortex_database_request_duration_seconds:50quantile"
                },
                {
                  expr:
                    "sum(rate(cortex_database_request_duration_seconds_sum[1m])) by (job, method) / sum(rate(cortex_database_request_duration_seconds_count[1m])) by (job, method)",
                  record:
                    "job_method:cortex_database_request_duration_seconds:avg"
                },
                {
                  expr:
                    "sum(rate(cortex_database_request_duration_seconds_bucket[1m])) by (le, job, method)",
                  record:
                    "job_method:cortex_database_request_duration_seconds_bucket:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_database_request_duration_seconds_sum[1m])) by (job, method)",
                  record:
                    "job_method:cortex_database_request_duration_seconds_sum:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_database_request_duration_seconds_count[1m])) by (job, method)",
                  record:
                    "job_method:cortex_database_request_duration_seconds_count:sum_rate"
                },
                {
                  expr:
                    "histogram_quantile(0.99, sum(rate(cortex_gcs_request_duration_seconds_bucket[1m])) by (le, job, operation))",
                  record:
                    "job_operation:cortex_gcs_request_duration_seconds:99quantile"
                },
                {
                  expr:
                    "histogram_quantile(0.50, sum(rate(cortex_gcs_request_duration_seconds_bucket[1m])) by (le, job, operation))",
                  record:
                    "job_operation:cortex_gcs_request_duration_seconds:50quantile"
                },
                {
                  expr:
                    "sum(rate(cortex_gcs_request_duration_seconds_sum[1m])) by (job, operation) / sum(rate(cortex_gcs_request_duration_seconds_count[1m])) by (job, operation)",
                  record:
                    "job_operation:cortex_gcs_request_duration_seconds:avg"
                },
                {
                  expr:
                    "sum(rate(cortex_gcs_request_duration_seconds_bucket[1m])) by (le, job, operation)",
                  record:
                    "job_operation:cortex_gcs_request_duration_seconds_bucket:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_gcs_request_duration_seconds_sum[1m])) by (job, operation)",
                  record:
                    "job_operation:cortex_gcs_request_duration_seconds_sum:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_gcs_request_duration_seconds_count[1m])) by (job, operation)",
                  record:
                    "job_operation:cortex_gcs_request_duration_seconds_count:sum_rate"
                },
                {
                  expr:
                    "histogram_quantile(0.99, sum(rate(cortex_kv_request_duration_seconds_bucket[1m])) by (le, job))",
                  record: "job:cortex_kv_request_duration_seconds:99quantile"
                },
                {
                  expr:
                    "histogram_quantile(0.50, sum(rate(cortex_kv_request_duration_seconds_bucket[1m])) by (le, job))",
                  record: "job:cortex_kv_request_duration_seconds:50quantile"
                },
                {
                  expr:
                    "sum(rate(cortex_kv_request_duration_seconds_sum[1m])) by (job) / sum(rate(cortex_kv_request_duration_seconds_count[1m])) by (job)",
                  record: "job:cortex_kv_request_duration_seconds:avg"
                },
                {
                  expr:
                    "sum(rate(cortex_kv_request_duration_seconds_bucket[1m])) by (le, job)",
                  record:
                    "job:cortex_kv_request_duration_seconds_bucket:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_kv_request_duration_seconds_sum[1m])) by (job)",
                  record: "job:cortex_kv_request_duration_seconds_sum:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_kv_request_duration_seconds_count[1m])) by (job)",
                  record:
                    "job:cortex_kv_request_duration_seconds_count:sum_rate"
                }
              ]
            },
            {
              name: "frontend_rules",
              rules: [
                {
                  expr:
                    "histogram_quantile(0.99, sum(rate(tsdb_gw_request_duration_seconds_bucket[1m])) by (le, job))",
                  record: "job:tsdb_gw_request_duration_seconds:99quantile"
                },
                {
                  expr:
                    "histogram_quantile(0.50, sum(rate(tsdb_gw_request_duration_seconds_bucket[1m])) by (le, job))",
                  record: "job:tsdb_gw_request_duration_seconds:50quantile"
                },
                {
                  expr:
                    "sum(rate(tsdb_gw_request_duration_seconds_sum[1m])) by (job) / sum(rate(tsdb_gw_request_duration_seconds_count[1m])) by (job)",
                  record: "job:tsdb_gw_request_duration_seconds:avg"
                },
                {
                  expr:
                    "sum(rate(tsdb_gw_request_duration_seconds_bucket[1m])) by (le, job)",
                  record: "job:tsdb_gw_request_duration_seconds_bucket:sum_rate"
                },
                {
                  expr:
                    "sum(rate(tsdb_gw_request_duration_seconds_sum[1m])) by (job)",
                  record: "job:tsdb_gw_request_duration_seconds_sum:sum_rate"
                },
                {
                  expr:
                    "sum(rate(tsdb_gw_request_duration_seconds_count[1m])) by (job)",
                  record: "job:tsdb_gw_request_duration_seconds_count:sum_rate"
                },
                {
                  expr:
                    "histogram_quantile(0.99, sum(rate(tsdb_gw_request_duration_seconds_bucket[1m])) by (le, job, route))",
                  record:
                    "job_route:tsdb_gw_request_duration_seconds:99quantile"
                },
                {
                  expr:
                    "histogram_quantile(0.50, sum(rate(tsdb_gw_request_duration_seconds_bucket[1m])) by (le, job, route))",
                  record:
                    "job_route:tsdb_gw_request_duration_seconds:50quantile"
                },
                {
                  expr:
                    "sum(rate(tsdb_gw_request_duration_seconds_sum[1m])) by (job, route) / sum(rate(tsdb_gw_request_duration_seconds_count[1m])) by (job, route)",
                  record: "job_route:tsdb_gw_request_duration_seconds:avg"
                },
                {
                  expr:
                    "sum(rate(tsdb_gw_request_duration_seconds_bucket[1m])) by (le, job, route)",
                  record:
                    "job_route:tsdb_gw_request_duration_seconds_bucket:sum_rate"
                },
                {
                  expr:
                    "sum(rate(tsdb_gw_request_duration_seconds_sum[1m])) by (job, route)",
                  record:
                    "job_route:tsdb_gw_request_duration_seconds_sum:sum_rate"
                },
                {
                  expr:
                    "sum(rate(tsdb_gw_request_duration_seconds_count[1m])) by (job, route)",
                  record:
                    "job_route:tsdb_gw_request_duration_seconds_count:sum_rate"
                },
                {
                  expr:
                    "histogram_quantile(0.99, sum(rate(tsdb_gw_request_duration_seconds_bucket[1m])) by (le, namespace, job, route))",
                  record:
                    "namespace_job_route:tsdb_gw_request_duration_seconds:99quantile"
                },
                {
                  expr:
                    "histogram_quantile(0.50, sum(rate(tsdb_gw_request_duration_seconds_bucket[1m])) by (le, namespace, job, route))",
                  record:
                    "namespace_job_route:tsdb_gw_request_duration_seconds:50quantile"
                },
                {
                  expr:
                    "sum(rate(tsdb_gw_request_duration_seconds_sum[1m])) by (namespace, job, route) / sum(rate(tsdb_gw_request_duration_seconds_count[1m])) by (namespace, job, route)",
                  record:
                    "namespace_job_route:tsdb_gw_request_duration_seconds:avg"
                },
                {
                  expr:
                    "sum(rate(tsdb_gw_request_duration_seconds_bucket[1m])) by (le, namespace, job, route)",
                  record:
                    "namespace_job_route:tsdb_gw_request_duration_seconds_bucket:sum_rate"
                },
                {
                  expr:
                    "sum(rate(tsdb_gw_request_duration_seconds_sum[1m])) by (namespace, job, route)",
                  record:
                    "namespace_job_route:tsdb_gw_request_duration_seconds_sum:sum_rate"
                },
                {
                  expr:
                    "sum(rate(tsdb_gw_request_duration_seconds_count[1m])) by (namespace, job, route)",
                  record:
                    "namespace_job_route:tsdb_gw_request_duration_seconds_count:sum_rate"
                },
                {
                  expr:
                    "histogram_quantile(0.99, sum(rate(cortex_gw_request_duration_seconds_bucket[1m])) by (le, job))",
                  record: "job:cortex_gw_request_duration_seconds:99quantile"
                },
                {
                  expr:
                    "histogram_quantile(0.50, sum(rate(cortex_gw_request_duration_seconds_bucket[1m])) by (le, job))",
                  record: "job:cortex_gw_request_duration_seconds:50quantile"
                },
                {
                  expr:
                    "sum(rate(cortex_gw_request_duration_seconds_sum[1m])) by (job) / sum(rate(cortex_gw_request_duration_seconds_count[1m])) by (job)",
                  record: "job:cortex_gw_request_duration_seconds:avg"
                },
                {
                  expr:
                    "sum(rate(cortex_gw_request_duration_seconds_bucket[1m])) by (le, job)",
                  record:
                    "job:cortex_gw_request_duration_seconds_bucket:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_gw_request_duration_seconds_sum[1m])) by (job)",
                  record: "job:cortex_gw_request_duration_seconds_sum:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_gw_request_duration_seconds_count[1m])) by (job)",
                  record:
                    "job:cortex_gw_request_duration_seconds_count:sum_rate"
                },
                {
                  expr:
                    "histogram_quantile(0.99, sum(rate(cortex_gw_request_duration_seconds_bucket[1m])) by (le, job, route))",
                  record:
                    "job_route:cortex_gw_request_duration_seconds:99quantile"
                },
                {
                  expr:
                    "histogram_quantile(0.50, sum(rate(cortex_gw_request_duration_seconds_bucket[1m])) by (le, job, route))",
                  record:
                    "job_route:cortex_gw_request_duration_seconds:50quantile"
                },
                {
                  expr:
                    "sum(rate(cortex_gw_request_duration_seconds_sum[1m])) by (job, route) / sum(rate(cortex_gw_request_duration_seconds_count[1m])) by (job, route)",
                  record: "job_route:cortex_gw_request_duration_seconds:avg"
                },
                {
                  expr:
                    "sum(rate(cortex_gw_request_duration_seconds_bucket[1m])) by (le, job, route)",
                  record:
                    "job_route:cortex_gw_request_duration_seconds_bucket:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_gw_request_duration_seconds_sum[1m])) by (job, route)",
                  record:
                    "job_route:cortex_gw_request_duration_seconds_sum:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_gw_request_duration_seconds_count[1m])) by (job, route)",
                  record:
                    "job_route:cortex_gw_request_duration_seconds_count:sum_rate"
                },
                {
                  expr:
                    "histogram_quantile(0.99, sum(rate(cortex_gw_request_duration_seconds_bucket[1m])) by (le, namespace, job, route))",
                  record:
                    "namespace_job_route:cortex_gw_request_duration_seconds:99quantile"
                },
                {
                  expr:
                    "histogram_quantile(0.50, sum(rate(cortex_gw_request_duration_seconds_bucket[1m])) by (le, namespace, job, route))",
                  record:
                    "namespace_job_route:cortex_gw_request_duration_seconds:50quantile"
                },
                {
                  expr:
                    "sum(rate(cortex_gw_request_duration_seconds_sum[1m])) by (namespace, job, route) / sum(rate(cortex_gw_request_duration_seconds_count[1m])) by (namespace, job, route)",
                  record:
                    "namespace_job_route:cortex_gw_request_duration_seconds:avg"
                },
                {
                  expr:
                    "sum(rate(cortex_gw_request_duration_seconds_bucket[1m])) by (le, namespace, job, route)",
                  record:
                    "namespace_job_route:cortex_gw_request_duration_seconds_bucket:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_gw_request_duration_seconds_sum[1m])) by (namespace, job, route)",
                  record:
                    "namespace_job_route:cortex_gw_request_duration_seconds_sum:sum_rate"
                },
                {
                  expr:
                    "sum(rate(cortex_gw_request_duration_seconds_count[1m])) by (namespace, job, route)",
                  record:
                    "namespace_job_route:cortex_gw_request_duration_seconds_count:sum_rate"
                }
              ]
            },
            {
              name: "cortex_slo_rules",
              rules: [
                {
                  expr:
                    '1 -\n(\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_bucket{status_code!~"5..", le="1", route="api_v1_push", job=~".*.cortex-api"}[5m]))\n/\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_count{route="api_v1_push", job=~".*.cortex-api"}[5m]))\n)\n',
                  record:
                    "namespace_job:cortex_gateway_write_slo_errors_per_request:ratio_rate5m"
                },
                {
                  expr:
                    '1 -\n(\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_bucket{status_code!~"5..", le="1", route="api_v1_push", job=~".*.cortex-api"}[30m]))\n/\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_count{route="api_v1_push", job=~".*.cortex-api"}[30m]))\n)\n',
                  record:
                    "namespace_job:cortex_gateway_write_slo_errors_per_request:ratio_rate30m"
                },
                {
                  expr:
                    '1 -\n(\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_bucket{status_code!~"5..", le="1", route="api_v1_push", job=~".*.cortex-api"}[1h]))\n/\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_count{route="api_v1_push", job=~".*.cortex-api"}[1h]))\n)\n',
                  record:
                    "namespace_job:cortex_gateway_write_slo_errors_per_request:ratio_rate1h"
                },
                {
                  expr:
                    '1 -\n(\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_bucket{status_code!~"5..", le="1", route="api_v1_push", job=~".*.cortex-api"}[2h]))\n/\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_count{route="api_v1_push", job=~".*.cortex-api"}[2h]))\n)\n',
                  record:
                    "namespace_job:cortex_gateway_write_slo_errors_per_request:ratio_rate2h"
                },
                {
                  expr:
                    '1 -\n(\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_bucket{status_code!~"5..", le="1", route="api_v1_push", job=~".*.cortex-api"}[6h]))\n/\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_count{route="api_v1_push", job=~".*.cortex-api"}[6h]))\n)\n',
                  record:
                    "namespace_job:cortex_gateway_write_slo_errors_per_request:ratio_rate6h"
                },
                {
                  expr:
                    '1 -\n(\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_bucket{status_code!~"5..", le="1", route="api_v1_push", job=~".*.cortex-api"}[1d]))\n/\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_count{route="api_v1_push", job=~".*.cortex-api"}[1d]))\n)\n',
                  record:
                    "namespace_job:cortex_gateway_write_slo_errors_per_request:ratio_rate1d"
                },
                {
                  expr:
                    '1 -\n(\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_bucket{status_code!~"5..", le="1", route="api_v1_push", job=~".*.cortex-api"}[3d]))\n/\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_count{route="api_v1_push", job=~".*.cortex-api"}[3d]))\n)\n',
                  record:
                    "namespace_job:cortex_gateway_write_slo_errors_per_request:ratio_rate3d"
                },
                {
                  expr:
                    '1 -\n(\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_bucket{status_code!~"5..",le="2.5",route=~"api_v1_query.*", job=~".*.cortex-api"}[5m]))\n/\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_count{route=~"api_v1_query.*", job=~".*.cortex-api"}[5m]))\n)\n',
                  record:
                    "namespace_job:cortex_gateway_read_slo_errors_per_request:ratio_rate5m"
                },
                {
                  expr:
                    '1 -\n(\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_bucket{status_code!~"5..",le="2.5",route=~"api_v1_query.*", job=~".*.cortex-api"}[30m]))\n/\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_count{route=~"api_v1_query.*", job=~".*.cortex-api"}[30m]))\n)\n',
                  record:
                    "namespace_job:cortex_gateway_read_slo_errors_per_request:ratio_rate30m"
                },
                {
                  expr:
                    '1 -\n(\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_bucket{status_code!~"5..",le="2.5",route=~"api_v1_query.*", job=~".*.cortex-api"}[1h]))\n/\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_count{route=~"api_v1_query.*", job=~".*.cortex-api"}[1h]))\n)\n',
                  record:
                    "namespace_job:cortex_gateway_read_slo_errors_per_request:ratio_rate1h"
                },
                {
                  expr:
                    '1 -\n(\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_bucket{status_code!~"5..",le="2.5",route=~"api_v1_query.*", job=~".*.cortex-api"}[2h]))\n/\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_count{route=~"api_v1_query.*", job=~".*.cortex-api"}[2h]))\n)\n',
                  record:
                    "namespace_job:cortex_gateway_read_slo_errors_per_request:ratio_rate2h"
                },
                {
                  expr:
                    '1 -\n(\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_bucket{status_code!~"5..",le="2.5",route=~"api_v1_query.*", job=~".*.cortex-api"}[6h]))\n/\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_count{route=~"api_v1_query.*", job=~".*.cortex-api"}[6h]))\n)\n',
                  record:
                    "namespace_job:cortex_gateway_read_slo_errors_per_request:ratio_rate6h"
                },
                {
                  expr:
                    '1 -\n(\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_bucket{status_code!~"5..",le="2.5",route=~"api_v1_query.*", job=~".*.cortex-api"}[1d]))\n/\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_count{route=~"api_v1_query.*", job=~".*.cortex-api"}[1d]))\n)\n',
                  record:
                    "namespace_job:cortex_gateway_read_slo_errors_per_request:ratio_rate1d"
                },
                {
                  expr:
                    '1 -\n(\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_bucket{status_code!~"5..",le="2.5",route=~"api_v1_query.*", job=~".*.cortex-api"}[3d]))\n/\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_count{route=~"api_v1_query.*", job=~".*.cortex-api"}[3d]))\n)\n',
                  record:
                    "namespace_job:cortex_gateway_read_slo_errors_per_request:ratio_rate3d"
                },
                {
                  expr:
                    '1 -\n(\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_bucket{status_code!~"error|5..",le="1",route="cortex-write"}[5m]))\n/\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_count{route="cortex-write"}[5m]))\n)\n',
                  record:
                    "namespace_job:cortex_gw_write_slo_errors_per_request:ratio_rate5m"
                },
                {
                  expr:
                    '1 -\n(\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_bucket{status_code!~"error|5..",le="1",route="cortex-write"}[30m]))\n/\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_count{route="cortex-write"}[30m]))\n)\n',
                  record:
                    "namespace_job:cortex_gw_write_slo_errors_per_request:ratio_rate30m"
                },
                {
                  expr:
                    '1 -\n(\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_bucket{status_code!~"error|5..",le="1",route="cortex-write"}[1h]))\n/\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_count{route="cortex-write"}[1h]))\n)\n',
                  record:
                    "namespace_job:cortex_gw_write_slo_errors_per_request:ratio_rate1h"
                },
                {
                  expr:
                    '1 -\n(\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_bucket{status_code!~"error|5..",le="1",route="cortex-write"}[2h]))\n/\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_count{route="cortex-write"}[2h]))\n)\n',
                  record:
                    "namespace_job:cortex_gw_write_slo_errors_per_request:ratio_rate2h"
                },
                {
                  expr:
                    '1 -\n(\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_bucket{status_code!~"error|5..",le="1",route="cortex-write"}[6h]))\n/\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_count{route="cortex-write"}[6h]))\n)\n',
                  record:
                    "namespace_job:cortex_gw_write_slo_errors_per_request:ratio_rate6h"
                },
                {
                  expr:
                    '1 -\n(\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_bucket{status_code!~"error|5..",le="1",route="cortex-write"}[1d]))\n/\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_count{route="cortex-write"}[1d]))\n)\n',
                  record:
                    "namespace_job:cortex_gw_write_slo_errors_per_request:ratio_rate1d"
                },
                {
                  expr:
                    '1 -\n(\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_bucket{status_code!~"error|5..",le="1",route="cortex-write"}[3d]))\n/\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_count{route="cortex-write"}[3d]))\n)\n',
                  record:
                    "namespace_job:cortex_gw_write_slo_errors_per_request:ratio_rate3d"
                },
                {
                  expr:
                    '1 -\n(\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_bucket{status_code!~"error|5..",le="2.5",route="cortex-read"}[5m]))\n/\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_count{route="cortex-read"}[5m]))\n)\n',
                  record:
                    "namespace_job:cortex_gw_read_slo_errors_per_request:ratio_rate5m"
                },
                {
                  expr:
                    '1 -\n(\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_bucket{status_code!~"error|5..",le="2.5",route="cortex-read"}[30m]))\n/\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_count{route="cortex-read"}[30m]))\n)\n',
                  record:
                    "namespace_job:cortex_gw_read_slo_errors_per_request:ratio_rate30m"
                },
                {
                  expr:
                    '1 -\n(\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_bucket{status_code!~"error|5..",le="2.5",route="cortex-read"}[1h]))\n/\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_count{route="cortex-read"}[1h]))\n)\n',
                  record:
                    "namespace_job:cortex_gw_read_slo_errors_per_request:ratio_rate1h"
                },
                {
                  expr:
                    '1 -\n(\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_bucket{status_code!~"error|5..",le="2.5",route="cortex-read"}[2h]))\n/\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_count{route="cortex-read"}[2h]))\n)\n',
                  record:
                    "namespace_job:cortex_gw_read_slo_errors_per_request:ratio_rate2h"
                },
                {
                  expr:
                    '1 -\n(\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_bucket{status_code!~"error|5..",le="2.5",route="cortex-read"}[6h]))\n/\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_count{route="cortex-read"}[6h]))\n)\n',
                  record:
                    "namespace_job:cortex_gw_read_slo_errors_per_request:ratio_rate6h"
                },
                {
                  expr:
                    '1 -\n(\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_bucket{status_code!~"error|5..",le="2.5",route="cortex-read"}[1d]))\n/\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_count{route="cortex-read"}[1d]))\n)\n',
                  record:
                    "namespace_job:cortex_gw_read_slo_errors_per_request:ratio_rate1d"
                },
                {
                  expr:
                    '1 -\n(\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_bucket{status_code!~"error|5..",le="2.5",route="cortex-read"}[3d]))\n/\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_count{route="cortex-read"}[3d]))\n)\n',
                  record:
                    "namespace_job:cortex_gw_read_slo_errors_per_request:ratio_rate3d"
                }
              ]
            },
            {
              name: "cortex_received_samples",
              rules: [
                {
                  expr:
                    'sum by (namespace) (rate(cortex_distributor_received_samples_total{job=~".*.distributor"}[5m]))\n',
                  record: "namespace:cortex_distributor_received_samples:rate5m"
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
            tenant: "system",
            stack_name: name
          },
          name: "cortex-prometheus-alerts",
          namespace
        },
        spec: {
          groups: [
            {
              name: "cortex_alerts",
              rules: [
                {
                  alert: "CortexIngesterUnhealthy",
                  annotations: {
                    message:
                      "{{ $labels.job }} reports more than one unhealthy ingester.",
                    runbook_url:
                      runbookUrl + "/cortex.md#CortexIngesterUnhealthy"
                  },
                  expr:
                    'min(cortex_ring_members{state="Unhealthy", job=~"[a-z].+distributor"}) by (namespace, job) > 0\n',
                  for: "15m",
                  labels: {
                    severity: "critical"
                  }
                },
                {
                  alert: "CortexFlushStuck",
                  annotations: {
                    message:
                      "{{ $labels.job }}/{{ $labels.instance }} is stuck flushing chunks.",
                    runbook_url: runbookUrl + "/cortex.md#CortexFlushStuck"
                  },
                  expr:
                    "(cortex_ingester_memory_chunks / cortex_ingester_memory_series) > 1.3\n",
                  for: "15m",
                  labels: {
                    severity: "critical"
                  }
                },
                {
                  alert: "CortexRequestErrors",
                  annotations: {
                    message:
                      '{{ $labels.job }} {{ $labels.route }} is experiencing {{ printf "%.2f" $value }}% errors.\n',
                    runbook_url: runbookUrl + "/cortex.md#CortexRequestErrors"
                  },
                  expr:
                    '100 * sum(rate(cortex_request_duration_seconds_count{status_code=~"5.."}[1m])) by (namespace, job, route)\n  /\nsum(rate(cortex_request_duration_seconds_count[1m])) by (namespace, job, route)\n  > 1\n',
                  for: "15m",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "CortexRequestLatency",
                  annotations: {
                    message:
                      '{{ $labels.job }} {{ $labels.route }} is experiencing {{ printf "%.2f" $value }}s 99th percentile latency.\n',
                    runbook_url: runbookUrl + "/cortex.md#CortexRequestLatency"
                  },
                  expr:
                    'namespace_job_route:cortex_request_duration_seconds:99quantile{route!~"metrics|/frontend.Frontend/Process"}\n   >\n2.5\n',
                  for: "15m",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "CortexTableSyncFailure",
                  annotations: {
                    message:
                      '{{ $labels.job }} is experiencing {{ printf "%.2f" $value }}% errors syncing tables.\n',
                    runbook_url:
                      runbookUrl + "/cortex.md#CortexTableSyncFailure"
                  },
                  expr:
                    '100 * rate(cortex_dynamo_sync_tables_seconds_count{status_code!~"2.."}[15m])\n  /\nrate(cortex_dynamo_sync_tables_seconds_count[15m])\n  > 10\n',
                  for: "30m",
                  labels: {
                    severity: "critical"
                  }
                },
                {
                  alert: "CortexQueriesIncorrect",
                  annotations: {
                    message:
                      '{{ $labels.job }} is reporting incorrect results for {{ printf "%.2f" $value }}% of queries.\n',
                    runbook_url:
                      runbookUrl + "/cortex.md#CortexQueriesIncorrect"
                  },
                  expr:
                    '100 * sum by (job, namespace) (rate(test_exporter_test_case_result_total{result="fail"}[5m]))\n  /\nsum by (job, namespace) (rate(test_exporter_test_case_result_total[5m])) > 1\n',
                  for: "15m",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "CortexQuerierCapacityFull",
                  annotations: {
                    message:
                      "{{ $labels.job }} is at capacity processing queries.\n",
                    runbook_url:
                      runbookUrl + "/cortex.md#CortexQuerierCapacityFull"
                  },
                  expr:
                    'prometheus_engine_queries_concurrent_max{job=~".+.querier"} - prometheus_engine_queries{job=~".+.querier"} == 0\n',
                  for: "5m",
                  labels: {
                    severity: "critical"
                  }
                },
                {
                  alert: "CortexFrontendQueriesStuck",
                  annotations: {
                    message:
                      "{{ $labels.job }} has {{ $value }} queued up queries.\n",
                    runbook_url:
                      runbookUrl + "/cortex.md#CortexFrontendQueriesStuck"
                  },
                  expr:
                    'sum by (namespace) (cortex_query_frontend_queue_length{job=~".+.query-frontend"}) > 1\n',
                  for: "5m",
                  labels: {
                    severity: "critical"
                  }
                },
                {
                  alert: "CortexCacheRequestErrors",
                  annotations: {
                    message:
                      '{{ $labels.job }} cache {{ $labels.method }} is experiencing {{ printf "%.2f" $value }}% errors.\n',
                    runbook_url:
                      runbookUrl + "/cortex.md#CortexCacheRequestErrors"
                  },
                  expr:
                    '100 * sum(rate(cortex_cache_request_duration_seconds_count{status_code=~"5.."}[1m])) by (namespace, job, method)\n  /\nsum(rate(cortex_cache_request_duration_seconds_count[1m])) by (namespace, job, method)\n  > 1\n',
                  for: "15m",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "CortexIngesterRestarts",
                  annotations: {
                    message:
                      "{{ $labels.namespace }}/{{ $labels.pod }} is restarting",
                    runbook_url:
                      runbookUrl + "/cortex.md#CortexIngesterRestarts"
                  },
                  expr:
                    'rate(kube_pod_container_status_restarts_total{container="ingester"}[30m]) > 0\n',
                  labels: {
                    severity: "critical"
                  }
                },
                {
                  alert: "CortexTransferFailed",
                  annotations: {
                    message:
                      "{{ $labels.namespace }}/{{ $labels.pod }} transfer failed.",
                    runbook_url: runbookUrl + "/cortex.md#CortexTransferFailed"
                  },
                  expr:
                    'max_over_time(cortex_shutdown_duration_seconds_count{op="transfer",status!="success"}[15m])\n',
                  for: "5m",
                  labels: {
                    severity: "critical"
                  }
                },
                {
                  alert: "CortexOldChunkInMemory",
                  annotations: {
                    message:
                      "{{ $labels.namespace }}/{{ $labels.pod }} has very old unflushed chunk in memory.\n",
                    runbook_url:
                      runbookUrl + "/cortex.md#CortexOldChunkInMemory"
                  },
                  // TODO opstrace-prelaunch/issues/355
                  expr:
                    "(time() - cortex_oldest_unflushed_chunk_timestamp_seconds > 50400) and cortex_oldest_unflushed_chunk_timestamp_seconds > 0\n",
                  for: "5m",
                  labels: {
                    severity: "warning"
                  }
                }
              ]
            },
            {
              name: "cortex_slo_alerts",
              rules: [
                {
                  alert: "CortexWriteErrorBudgetBurn",
                  annotations: {
                    description:
                      "{{ $value | printf `%.2f` }}% of {{ $labels.job }}'s write requests in the last 1h are failing or too slow to meet the SLO.",
                    summary: "Cortex burns its write error budget too fast.",
                    runbook_url:
                      runbookUrl + "/cortex.md#CortexWriteErrorBudgetBurn"
                  },
                  expr:
                    "(\n  (\n  100 * namespace_job:cortex_gateway_write_slo_errors_per_request:ratio_rate1h\n  > 0.1 * 14.400000\n  )\nand\n  (\n  100 * namespace_job:cortex_gateway_write_slo_errors_per_request:ratio_rate5m\n  > 0.1 * 14.400000\n  )\n)\n",
                  for: "2m",
                  labels: {
                    period: "1h",
                    severity: "critical"
                  }
                },
                {
                  alert: "CortexWriteErrorBudgetBurn",
                  annotations: {
                    description:
                      "{{ $value | printf `%.2f` }}% of {{ $labels.job }}'s write requests in the last 6h are failing or too slow to meet the SLO.",
                    summary: "Cortex burns its write error budget too fast.",
                    runbook_url:
                      runbookUrl + "/cortex.md#CortexWriteErrorBudgetBurn"
                  },
                  expr:
                    "(\n  (\n  100 * namespace_job:cortex_gateway_write_slo_errors_per_request:ratio_rate6h\n  > 0.1 * 6.000000\n  )\nand\n  (\n  100 * namespace_job:cortex_gateway_write_slo_errors_per_request:ratio_rate30m\n  > 0.1 * 6.000000\n  )\n)\n",
                  for: "15m",
                  labels: {
                    period: "6h",
                    severity: "critical"
                  }
                },
                {
                  alert: "CortexWriteErrorBudgetBurn",
                  annotations: {
                    description:
                      "{{ $value | printf `%.2f` }}% of {{ $labels.job }}'s write requests in the last 1d are failing or too slow to meet the SLO.",
                    summary: "Cortex burns its write error budget too fast.",
                    runbook_url:
                      runbookUrl + "/cortex.md#CortexWriteErrorBudgetBurn"
                  },
                  expr:
                    "(\n  (\n  100 * namespace_job:cortex_gateway_write_slo_errors_per_request:ratio_rate1d\n  > 0.1 * 3.000000\n  )\nand\n  (\n  100 * namespace_job:cortex_gateway_write_slo_errors_per_request:ratio_rate2h\n  > 0.1 * 3.000000\n  )\n)\n",
                  for: "1h",
                  labels: {
                    period: "1d",
                    severity: "warning"
                  }
                },
                {
                  alert: "CortexWriteErrorBudgetBurn",
                  annotations: {
                    description:
                      "{{ $value | printf `%.2f` }}% of {{ $labels.job }}'s write requests in the last 3d are failing or too slow to meet the SLO.",
                    summary: "Cortex burns its write error budget too fast.",
                    runbook_url:
                      runbookUrl + "/cortex.md#CortexWriteErrorBudgetBurn"
                  },
                  expr:
                    "(\n  (\n  100 * namespace_job:cortex_gateway_write_slo_errors_per_request:ratio_rate3d\n  > 0.1 * 1.000000\n  )\nand\n  (\n  100 * namespace_job:cortex_gateway_write_slo_errors_per_request:ratio_rate6h\n  > 0.1 * 1.000000\n  )\n)\n",
                  for: "3h",
                  labels: {
                    period: "3d",
                    severity: "warning"
                  }
                },
                {
                  alert: "CortexReadErrorBudgetBurn",
                  annotations: {
                    description:
                      "{{ $value | printf `%.2f` }}% of {{ $labels.job }}'s read requests in the last 1h are failing or too slow to meet the SLO.",
                    summary: "Cortex burns its read error budget too fast.",
                    runbook_url:
                      runbookUrl + "/cortex.md#CortexReadErrorBudgetBurn"
                  },
                  expr:
                    "(\n  (\n  100 * namespace_job:cortex_gateway_read_slo_errors_per_request:ratio_rate1h\n  > 0.5 * 14.400000\n  )\nand\n  (\n  100 * namespace_job:cortex_gateway_read_slo_errors_per_request:ratio_rate5m\n  > 0.5 * 14.400000\n  )\n)\n",
                  for: "2m",
                  labels: {
                    period: "1h",
                    severity: "critical"
                  }
                },
                {
                  alert: "CortexReadErrorBudgetBurn",
                  annotations: {
                    description:
                      "{{ $value | printf `%.2f` }}% of {{ $labels.job }}'s read requests in the last 6h are failing or too slow to meet the SLO.",
                    summary: "Cortex burns its read error budget too fast.",
                    runbook_url:
                      runbookUrl + "/cortex.md#CortexReadErrorBudgetBurn"
                  },
                  expr:
                    "(\n  (\n  100 * namespace_job:cortex_gateway_read_slo_errors_per_request:ratio_rate6h\n  > 0.5 * 6.000000\n  )\nand\n  (\n  100 * namespace_job:cortex_gateway_read_slo_errors_per_request:ratio_rate30m\n  > 0.5 * 6.000000\n  )\n)\n",
                  for: "15m",
                  labels: {
                    period: "6h",
                    severity: "critical"
                  }
                },
                {
                  alert: "CortexReadErrorBudgetBurn",
                  annotations: {
                    description:
                      "{{ $value | printf `%.2f` }}% of {{ $labels.job }}'s read requests in the last 1d are failing or too slow to meet the SLO.",
                    summary: "Cortex burns its read error budget too fast.",
                    runbook_url:
                      runbookUrl + "/cortex.md#CortexReadErrorBudgetBurn"
                  },
                  expr:
                    "(\n  (\n  100 * namespace_job:cortex_gateway_read_slo_errors_per_request:ratio_rate1d\n  > 0.5 * 3.000000\n  )\nand\n  (\n  100 * namespace_job:cortex_gateway_read_slo_errors_per_request:ratio_rate2h\n  > 0.5 * 3.000000\n  )\n)\n",
                  for: "1h",
                  labels: {
                    period: "1d",
                    severity: "warning"
                  }
                },
                {
                  alert: "CortexReadErrorBudgetBurn",
                  annotations: {
                    description:
                      "{{ $value | printf `%.2f` }}% of {{ $labels.job }}'s read requests in the last 3d are failing or too slow to meet the SLO.",
                    summary: "Cortex burns its read error budget too fast.",
                    runbook_url:
                      runbookUrl + "/cortex.md#CortexReadErrorBudgetBurn"
                  },
                  expr:
                    "(\n  (\n  100 * namespace_job:cortex_gateway_read_slo_errors_per_request:ratio_rate3d\n  > 0.5 * 1.000000\n  )\nand\n  (\n  100 * namespace_job:cortex_gateway_read_slo_errors_per_request:ratio_rate6h\n  > 0.5 * 1.000000\n  )\n)\n",
                  for: "3h",
                  labels: {
                    period: "3d",
                    severity: "warning"
                  }
                },
                {
                  alert: "LegacyCortexWriteErrorBudgetBurn",
                  annotations: {
                    description:
                      "{{ $value | printf `%.2f` }}% of {{ $labels.job }}'s write requests in the last 1h are failing or too slow to meet the SLO.",
                    summary: "Cortex burns its write error budget too fast.",
                    runbook_url:
                      runbookUrl + "/cortex.md#LegacyCortexWriteErrorBudgetBurn"
                  },
                  expr:
                    "(\n  (\n  100 * namespace_job:cortex_gw_write_slo_errors_per_request:ratio_rate1h\n  > 0.1 * 14.400000\n  )\nand\n  (\n  100 * namespace_job:cortex_gw_write_slo_errors_per_request:ratio_rate5m\n  > 0.1 * 14.400000\n  )\n)\n",
                  for: "2m",
                  labels: {
                    period: "1h",
                    severity: "critical"
                  }
                },
                {
                  alert: "LegacyCortexWriteErrorBudgetBurn",
                  annotations: {
                    description:
                      "{{ $value | printf `%.2f` }}% of {{ $labels.job }}'s write requests in the last 6h are failing or too slow to meet the SLO.",
                    summary: "Cortex burns its write error budget too fast.",
                    runbook_url:
                      runbookUrl + "/cortex.md#LegacyCortexWriteErrorBudgetBurn"
                  },
                  expr:
                    "(\n  (\n  100 * namespace_job:cortex_gw_write_slo_errors_per_request:ratio_rate6h\n  > 0.1 * 6.000000\n  )\nand\n  (\n  100 * namespace_job:cortex_gw_write_slo_errors_per_request:ratio_rate30m\n  > 0.1 * 6.000000\n  )\n)\n",
                  for: "15m",
                  labels: {
                    period: "6h",
                    severity: "critical"
                  }
                },
                {
                  alert: "LegacyCortexWriteErrorBudgetBurn",
                  annotations: {
                    description:
                      "{{ $value | printf `%.2f` }}% of {{ $labels.job }}'s write requests in the last 1d are failing or too slow to meet the SLO.",
                    summary: "Cortex burns its write error budget too fast.",
                    runbook_url:
                      runbookUrl + "/cortex.md#LegacyCortexWriteErrorBudgetBurn"
                  },
                  expr:
                    "(\n  (\n  100 * namespace_job:cortex_gw_write_slo_errors_per_request:ratio_rate1d\n  > 0.1 * 3.000000\n  )\nand\n  (\n  100 * namespace_job:cortex_gw_write_slo_errors_per_request:ratio_rate2h\n  > 0.1 * 3.000000\n  )\n)\n",
                  for: "1h",
                  labels: {
                    period: "1d",
                    severity: "warning"
                  }
                },
                {
                  alert: "LegacyCortexWriteErrorBudgetBurn",
                  annotations: {
                    description:
                      "{{ $value | printf `%.2f` }}% of {{ $labels.job }}'s write requests in the last 3d are failing or too slow to meet the SLO.",
                    summary: "Cortex burns its write error budget too fast.",
                    runbook_url:
                      runbookUrl + "/cortex.md#LegacyCortexWriteErrorBudgetBurn"
                  },
                  expr:
                    "(\n  (\n  100 * namespace_job:cortex_gw_write_slo_errors_per_request:ratio_rate3d\n  > 0.1 * 1.000000\n  )\nand\n  (\n  100 * namespace_job:cortex_gw_write_slo_errors_per_request:ratio_rate6h\n  > 0.1 * 1.000000\n  )\n)\n",
                  for: "3h",
                  labels: {
                    period: "3d",
                    severity: "warning"
                  }
                },
                {
                  alert: "LegacyCortexReadErrorBudgetBurn",
                  annotations: {
                    description:
                      "{{ $value | printf `%.2f` }}% of {{ $labels.job }}'s read requests in the last 1h are failing or too slow to meet the SLO.",
                    summary: "Cortex burns its read error budget too fast.",
                    runbook_url:
                      runbookUrl + "/cortex.md#LegacyCortexReadErrorBudgetBurn"
                  },
                  expr:
                    "(\n  (\n  100 * namespace_job:cortex_gw_read_slo_errors_per_request:ratio_rate1h\n  > 0.5 * 14.400000\n  )\nand\n  (\n  100 * namespace_job:cortex_gw_read_slo_errors_per_request:ratio_rate5m\n  > 0.5 * 14.400000\n  )\n)\n",
                  for: "2m",
                  labels: {
                    period: "1h",
                    severity: "critical"
                  }
                },
                {
                  alert: "LegacyCortexReadErrorBudgetBurn",
                  annotations: {
                    description:
                      "{{ $value | printf `%.2f` }}% of {{ $labels.job }}'s read requests in the last 6h are failing or too slow to meet the SLO.",
                    summary: "Cortex burns its read error budget too fast.",
                    runbook_url:
                      runbookUrl + "/cortex.md#LegacyCortexReadErrorBudgetBurn"
                  },
                  expr:
                    "(\n  (\n  100 * namespace_job:cortex_gw_read_slo_errors_per_request:ratio_rate6h\n  > 0.5 * 6.000000\n  )\nand\n  (\n  100 * namespace_job:cortex_gw_read_slo_errors_per_request:ratio_rate30m\n  > 0.5 * 6.000000\n  )\n)\n",
                  for: "15m",
                  labels: {
                    period: "6h",
                    severity: "critical"
                  }
                },
                {
                  alert: "LegacyCortexReadErrorBudgetBurn",
                  annotations: {
                    description:
                      "{{ $value | printf `%.2f` }}% of {{ $labels.job }}'s read requests in the last 1d are failing or too slow to meet the SLO.",
                    summary: "Cortex burns its read error budget too fast.",
                    runbook_url:
                      runbookUrl + "/cortex.md#LegacyCortexReadErrorBudgetBurn"
                  },
                  expr:
                    "(\n  (\n  100 * namespace_job:cortex_gw_read_slo_errors_per_request:ratio_rate1d\n  > 0.5 * 3.000000\n  )\nand\n  (\n  100 * namespace_job:cortex_gw_read_slo_errors_per_request:ratio_rate2h\n  > 0.5 * 3.000000\n  )\n)\n",
                  for: "1h",
                  labels: {
                    period: "1d",
                    severity: "warning"
                  }
                },
                {
                  alert: "LegacyCortexReadErrorBudgetBurn",
                  annotations: {
                    description:
                      "{{ $value | printf `%.2f` }}% of {{ $labels.job }}'s read requests in the last 3d are failing or too slow to meet the SLO.",
                    summary: "Cortex burns its read error budget too fast.",
                    runbook_url:
                      runbookUrl + "/cortex.md#LegacyCortexReadErrorBudgetBurn"
                  },
                  expr:
                    "(\n  (\n  100 * namespace_job:cortex_gw_read_slo_errors_per_request:ratio_rate3d\n  > 0.5 * 1.000000\n  )\nand\n  (\n  100 * namespace_job:cortex_gw_read_slo_errors_per_request:ratio_rate6h\n  > 0.5 * 1.000000\n  )\n)\n",
                  for: "3h",
                  labels: {
                    period: "3d",
                    severity: "warning"
                  }
                }
              ]
            },
            {
              name: "cortex_gw_alerts",
              rules: [
                {
                  alert: "CortexGWRequestErrors",
                  annotations: {
                    message:
                      '{{ $labels.job }} {{ $labels.route }} is experiencing {{ printf "%.2f" $value }}% errors.\n',
                    runbook_url: runbookUrl + "/cortex.md#CortexGWRequestErrors"
                  },
                  expr:
                    '100 * sum(rate(cortex_gw_request_duration_seconds_count{status_code=~"5.."}[1m])) by (namespace, job, route)\n  /\nsum(rate(cortex_gw_request_duration_seconds_count[1m])) by (namespace, job, route)\n  > 0.1\n',
                  for: "15m",
                  labels: {
                    severity: "critical"
                  }
                },
                {
                  alert: "CortexGWRequestLatency",
                  annotations: {
                    message:
                      '{{ $labels.job }} {{ $labels.route }} is experiencing {{ printf "%.2f" $value }}s 99th percentile latency.\n',
                    runbook_url:
                      runbookUrl + "/cortex.md#CortexGWRequestLatency"
                  },
                  expr:
                    'namespace_job_route:cortex_gw_request_duration_seconds:99quantile{route!="metrics"}\n  >\n2.5\n',
                  for: "15m",
                  labels: {
                    severity: "critical"
                  }
                }
              ]
            },
            {
              name: "cortex-provisioning",
              rules: [
                {
                  alert: "CortexProvisioningMemcachedTooSmall",
                  annotations: {
                    message:
                      'Chunk memcached cluster for namespace {{ $labels.namespace }} are too small, should be at least {{ printf "%.2f" $value }}GB.\n',
                    runbook_url:
                      runbookUrl +
                      "/cortex.md#CortexProvisioningMemcachedTooSmall"
                  },
                  expr:
                    '(\n  4 *\n  sum by(namespace) (cortex_ingester_memory_series{job=~".+.ingester"} * cortex_ingester_chunk_size_bytes_sum{job=~".+.ingester"} / cortex_ingester_chunk_size_bytes_count{job=~".+.ingester"})\n   / 1e9\n)\n  >\n(\n  sum by (namespace) (memcached_limit_bytes{job=~".+.memcached"}) / 1e9\n)\n',
                  for: "15m",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "CortexProvisioningTooManyActiveSeries",
                  annotations: {
                    message:
                      "Too many active series for ingesters in namespace {{ $labels.namespace }}, add more ingesters.\n",
                    runbook_url:
                      runbookUrl +
                      "/cortex.md#CortexProvisioningTooManyActiveSeries"
                  },
                  expr:
                    'avg by (namespace) (cortex_ingester_memory_series{job=~".+.ingester"}) > 1.1e6\n  and\nsum by (namespace) (rate(cortex_ingester_received_chunks{job=~".+.ingester"}[1h])) == 0\n',
                  for: "1h",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "CortexProvisioningTooManyWrites",
                  annotations: {
                    message:
                      "Too much write QPS for ingesters in namespace {{ $labels.namespace }}, add more ingesters.\n",
                    runbook_url:
                      runbookUrl + "/cortex.md#CortexProvisioningTooManyWrites"
                  },
                  expr:
                    "avg by (namespace) (rate(cortex_ingester_ingested_samples_total[1m])) > 80e3\n",
                  for: "15m",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "CortexProvisioningTooMuchMemory",
                  annotations: {
                    message:
                      "Too much memory being used by ingesters in namespace {{ $labels.namespace }}, add more ingesters.\n",
                    runbook_url:
                      runbookUrl + "/cortex.md#CortexProvisioningTooMuchMemory"
                  },
                  expr:
                    'avg by (namespace) (container_memory_working_set_bytes{container_name="ingester"} / container_spec_memory_limit_bytes{container_name="ingester"}) > 0.7\n',
                  for: "15m",
                  labels: {
                    severity: "critical"
                  }
                }
              ]
            },
            {
              name: "memcached",
              rules: [
                {
                  alert: "MemcachedDown",
                  annotations: {
                    message:
                      "Memcached Instance {{ $labels.instance }} is down for more than 15mins.\n",
                    runbook_url: runbookUrl + "/cortex.md#MemcachedDown"
                  },
                  expr: "memcached_up == 0\n",
                  for: "15m",
                  labels: {
                    severity: "critical"
                  }
                }
              ]
            },
            {
              name: "ruler_alerts",
              rules: [
                {
                  alert: "CortexRulerFailedEvaluations",
                  annotations: {
                    message:
                      '{{ $labels.job }} is experiencing {{ printf "%.2f" $value }}% errors.\n',
                    runbook_url:
                      runbookUrl + "/cortex.md#CortexRulerFailedEvaluations"
                  },
                  expr:
                    "sum(rate(cortex_prometheus_rule_evaluation_failures_total[1m])) by (namespace, job)\n  /\nsum(rate(cortex_prometheus_rule_evaluation_total[1m])) by (namespace, job)\n  > 0.01\n",
                  for: "5m",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "CortexRulerMissedEvaluations",
                  annotations: {
                    message:
                      '{{ $labels.job }} is experiencing {{ printf "%.2f" $value }}% missed iterations.\n',
                    runbook_url:
                      runbookUrl + "/cortex.md#CortexRulerMissedEvaluations"
                  },
                  expr:
                    "sum(rate(cortex_prometheus_rule_group_missed_iterations_total[1m])) by (namespace, job)\n  /\nsum(rate(cortex_prometheus_rule_group_iterations_total[1m])) by (namespace, job)\n  > 0.01\n",
                  for: "5m",
                  labels: {
                    severity: "warning"
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
