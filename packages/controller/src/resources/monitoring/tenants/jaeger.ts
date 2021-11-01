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

import * as yaml from "js-yaml";
import {
  ConfigMap,
  ResourceCollection,
  Service,
  V1JaegerResource,
  V1ServicemonitorResource
} from "@opstrace/kubernetes";

import { State } from "../../../reducer";
import { Tenant } from "@opstrace/tenants";
import { getTenantNamespace } from "../../../helpers";
import { getTenantClickHouseName } from "../../../tasks/clickhouseTenants";
import { KubeConfig } from "@kubernetes/client-node";
import { DockerImages, getImagePullSecrets } from "@opstrace/controller-config";

export function JaegerResources(
  state: State,
  kubeConfig: KubeConfig,
  tenant: Tenant
): ResourceCollection {
  const collection = new ResourceCollection();
  const namespace = getTenantNamespace(tenant);
  const clickhouseTenant = getTenantClickHouseName(tenant);

  const jaegerClickhouseConfig = {
    // TODO(nickbp): update to new clickhouse instance name once it's changed
    address: "tcp://basic.clickhouse.svc.cluster.local:9000",

    max_span_count: 10_000_000,
    batch_write_size: 10_000,
    batch_flush_interval: "5s",
    // json or protobuf: guessing that protobuf is a bit faster/smaller
    encoding: "protobuf",

    username: clickhouseTenant,
    password: `${clickhouseTenant}_password`,
    database: clickhouseTenant,

    metrics_endpoint: "localhost:9090",
    // note: affects which sql init scripts are used
    replication: false,
    // days of data retention, or 0 to disable. configured at table setup via init sql scripts
    // reference: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree/#table_engine-mergetree-ttl
    // TODO(nickbp): switch to dedicated tracingRetentionDays flag? probably needs a config schema bump
    ttl: state.config.config?.metricRetentionDays
  };

  collection.add(
    new ConfigMap(
      {
        apiVersion: "v1",
        data: {
          "config.yaml": yaml.safeDump(jaegerClickhouseConfig)
        },
        kind: "ConfigMap",
        metadata: {
          name: "jaeger-clickhouse",
          namespace
        }
      },
      kubeConfig
    )
  );

  collection.add(
    new V1JaegerResource(
      {
        apiVersion: "jaegertracing.io/v1",
        kind: "Jaeger",
        metadata: {
          name: "jaeger",
          namespace
        },
        spec: {
          // strategy can be allInOne (default), production (separate pods), or streaming (separate pods + kafka)
          // for now we just use allInOne for each (per-tenant) instance
          // reference: https://www.jaegertracing.io/docs/1.27/operator/#allinone-default-strategy
          strategy: "allInOne",
          allInOne: {
            image: DockerImages.jaegerAllInOne,
            imagePullSecrets: getImagePullSecrets()
          }
          // reference: https://www.jaegertracing.io/docs/1.27/cli/#jaeger-all-in-one-grpc-plugin
          //options: {
          //  log-level: "debug"
          //}
        },
        storage: {
          type: "grpc-plugin",
          grpcPlugin: {
            image: DockerImages.jaegerClickhouse,
            imagePullSecrets: getImagePullSecrets()
          },
          options: {
            "grpc-storage-plugin": {
              binary: "/plugin/jaeger-clickhouse",
              "configuration-file": "/plugin-config/config.yaml"
              //"log-level": "debug"
            }
          }
        },
        ingress: {
          // We manage the Service/Ingress creation ourselves.
          enabled: false
        },
        ui: {
          options: {
            // TODO(nickbp): just an example, reference: https://www.jaegertracing.io/docs/1.27/frontend-ui/
            menu: [
              {
                label: "Hello Opstrace",
                items: [
                  {
                    label: "Docs",
                    url: "https://opstrace.com/docs"
                  },
                  {
                    label: "Blog",
                    url: "https://opstrace.com/blog"
                  }
                ]
              }
            ]
          }
        },
        // other options reference, e.g. labels or resources:
        //   https://www.jaegertracing.io/docs/1.27/operator/#finer-grained-configuration
        volumeMounts: [
          {
            name: "plugin-config",
            mountPath: "/plugin-config"
          }
        ],
        volumes: [
          {
            name: "plugin-config",
            configMap: {
              name: "jaeger-clickhouse"
            }
          }
        ]
      },
      kubeConfig
    )
  );

  // We have configured ingress:false, so we need to create the UI endpoint service
  collection.add(
    new Service(
      {
        apiVersion: "v1",
        kind: "Service",
        metadata: {
          name: "jaeger",
          namespace,
          labels: {
            app: "jaeger"
          }
        },
        spec: {
          ports: [
            {
              name: "ui",
              port: 14269,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: "ui" as any
            }
          ],
          selector: {
            app: "jaeger"
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
          name: "jaeger",
          namespace,
          labels: {
            app: "jaeger"
          }
        },
        spec: {
          endpoints: [
            {
              interval: "60s",
              port: "ui"
            }
          ],
          jobLabel: "job",
          namespaceSelector: {
            matchNames: [namespace]
          },
          selector: {
            matchLabels: {
              app: "jaeger"
            }
          }
        }
      },
      kubeConfig
    )
  );

  return collection;
}
