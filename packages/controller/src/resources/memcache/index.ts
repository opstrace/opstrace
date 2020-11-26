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
import {
  ResourceCollection,
  Service,
  V1ServicemonitorResource,
  StatefulSet,
  Namespace,
  withPodAntiAffinityRequired
} from "@opstrace/kubernetes";
import { State } from "../../reducer";
import { min, roundDown, select } from "@opstrace/utils";
import { getNodeCount } from "../../helpers";
import { DockerImages } from "@opstrace/controller-config";

export function MemcacheResources(
  state: State,
  kubeConfig: KubeConfig,
  namespace: string
): ResourceCollection {
  const collection = new ResourceCollection();

  const config = {
    memcached: {
      replicas: select(getNodeCount(state), [
        { "<=": 4, choose: 2 },
        { "<=": 9, choose: 3 },
        {
          "<=": Infinity,
          choose: min(4, roundDown(getNodeCount(state) / 3))
        }
      ]),
      resources: {
        requests: {
          memory: "3200Mi"
        }
      }
    },
    memcachedIndexWrites: {
      replicas: select(getNodeCount(state), [
        { "<=": 4, choose: 2 },
        { "<=": 9, choose: 3 },
        {
          "<=": Infinity,
          choose: min(4, roundDown(getNodeCount(state) / 3))
        }
      ]),
      resources: {
        requests: {
          memory: "1050Mi"
        }
      }
    },
    memcachedIndexQueries: {
      replicas: select(getNodeCount(state), [
        { "<=": 4, choose: 2 },
        { "<=": 9, choose: 3 },
        {
          "<=": Infinity,
          choose: min(4, roundDown(getNodeCount(state) / 3))
        }
      ]),
      resources: {
        requests: {
          memory: "1050Mi"
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

  collection.add(
    new Service(
      {
        apiVersion: "v1",
        kind: "Service",
        metadata: {
          labels: {
            name: "memcached"
          },
          name: "memcached",
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
            name: "memcached"
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
          name: "memcached",
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
              name: "memcached"
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
            name: "memcached-index-queries"
          },
          name: "memcached-index-queries",
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
            name: "memcached-index-queries"
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
            name: "memcached-index-queries",
            tenant: "system"
          },
          name: "memcached-index-queries",
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
              name: "memcached-index-queries"
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
          name: "memcached-index-queries",
          namespace
        },
        spec: {
          replicas: config.memcachedIndexQueries.replicas,
          serviceName: "memcached-index-queries",
          podManagementPolicy: "Parallel",
          selector: {
            matchLabels: {
              name: "memcached-index-queries"
            }
          },
          template: {
            metadata: {
              labels: {
                name: "memcached-index-queries"
              }
            },
            spec: {
              affinity: withPodAntiAffinityRequired({
                name: "memcached-index-queries"
              }),
              containers: [
                {
                  args: ["-m 1024", "-I 5m", "-c 1024", "-v"],
                  image: DockerImages.memcached,
                  imagePullPolicy: "IfNotPresent",
                  name: "memcached",
                  ports: [
                    {
                      containerPort: 11211,
                      name: "client"
                    }
                  ],
                  resources: config.memcachedIndexQueries.resources
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
    new StatefulSet(
      {
        apiVersion: "apps/v1",
        kind: "StatefulSet",
        metadata: {
          name: "memcached-index-writes",
          namespace
        },
        spec: {
          replicas: config.memcachedIndexWrites.replicas,
          serviceName: "memcached-index-writes",
          podManagementPolicy: "Parallel",
          selector: {
            matchLabels: {
              name: "memcached-index-writes"
            }
          },
          template: {
            metadata: {
              labels: {
                name: "memcached-index-writes"
              }
            },
            spec: {
              affinity: withPodAntiAffinityRequired({
                name: "memcached-index-writes"
              }),
              containers: [
                {
                  args: ["-m 1024", "-I 1m", "-c 1024", "-v"],
                  image: DockerImages.memcached,
                  imagePullPolicy: "IfNotPresent",
                  name: "memcached",
                  ports: [
                    {
                      containerPort: 11211,
                      name: "client"
                    }
                  ],
                  resources: config.memcachedIndexWrites.resources
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
    new StatefulSet(
      {
        apiVersion: "apps/v1",
        kind: "StatefulSet",
        metadata: {
          name: "memcached",
          namespace
        },
        spec: {
          replicas: config.memcached.replicas,
          serviceName: "memcached",
          podManagementPolicy: "Parallel",
          selector: {
            matchLabels: {
              name: "memcached"
            }
          },
          template: {
            metadata: {
              labels: {
                name: "memcached"
              }
            },
            spec: {
              affinity: withPodAntiAffinityRequired({
                name: "memcached"
              }),
              containers: [
                {
                  args: ["-m 2048", "-I 2m", "-c 1024", "-v"],
                  image: DockerImages.memcached,
                  imagePullPolicy: "IfNotPresent",
                  name: "memcached",
                  ports: [
                    {
                      containerPort: 11211,
                      name: "client"
                    }
                  ],
                  resources: config.memcached.resources
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

  return collection;
}
