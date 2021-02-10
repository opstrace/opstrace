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

import { KubeConfig } from "@kubernetes/client-node";
import {
  ResourceCollection,
  Service,
  Secret,
  Deployment,
  withPodAntiAffinityRequired
} from "@opstrace/kubernetes";
import { State } from "../../reducer";
import { generateSecretValue } from "../../helpers";
import { DockerImages } from "@opstrace/controller-config";

export function RedisResources(
  state: State,
  kubeConfig: KubeConfig,
  namespace: string
): ResourceCollection {
  const collection = new ResourceCollection();

  const redisPasswordSecret = new Secret(
    {
      apiVersion: "v1",
      kind: "Secret",
      metadata: {
        name: "redis-password",
        namespace
      },
      data: {
        REDIS_MASTER_PASSWORD: Buffer.from(generateSecretValue()).toString(
          "base64"
        ),
        REDIS_SLAVE_PASSWORD: Buffer.from(generateSecretValue()).toString(
          "base64"
        )
      }
    },
    kubeConfig
  );
  // We don't want this value to change once it exists.
  // The value of this secret can always be updated manually in the cluster if needs be (kubectl delete <name> -n application) and the controller will create a new one.
  redisPasswordSecret.setImmutable();
  collection.add(redisPasswordSecret);

  collection.add(
    new Service(
      {
        apiVersion: "v1",
        kind: "Service",
        metadata: {
          name: "redis-master",
          namespace,
          labels: {
            app: "redis",
            role: "master"
          }
        },
        spec: {
          ports: [
            {
              name: "redis",
              port: 6379,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: 6379 as any
            }
          ],
          selector: {
            app: "redis",
            role: "master"
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
          name: "redis-slave",
          labels: {
            app: "redis",
            role: "slave"
          }
        },
        spec: {
          ports: [
            {
              port: 6379
            }
          ],
          selector: {
            app: "redis",
            role: "slave"
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
          name: "redis-master",
          namespace,
          labels: {
            app: "redis"
          }
        },
        spec: {
          selector: {
            matchLabels: {
              app: "redis",
              role: "master"
            }
          },
          replicas: 1,
          template: {
            metadata: {
              labels: {
                app: "redis",
                role: "master"
              }
            },
            spec: {
              containers: [
                {
                  name: "master",
                  image: DockerImages.redis,
                  resources: {
                    requests: {
                      cpu: "100m",
                      memory: "100Mi"
                    }
                  },
                  env: [
                    {
                      name: "REDIS_REPLICATION_MODE",
                      value: "master"
                    },
                    {
                      name: "REDIS_PASSWORD",
                      valueFrom: {
                        secretKeyRef: {
                          name: "redis-password",
                          key: "REDIS_MASTER_PASSWORD"
                        }
                      }
                    }
                  ],
                  ports: [
                    {
                      containerPort: 6379
                    }
                  ]
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
    new Deployment(
      {
        apiVersion: "apps/v1",
        kind: "Deployment",
        metadata: {
          name: "redis-slave",
          namespace,
          labels: {
            app: "redis"
          }
        },
        spec: {
          selector: {
            matchLabels: {
              app: "redis",
              role: "slave"
            }
          },
          replicas: 2,
          template: {
            metadata: {
              labels: {
                app: "redis",
                role: "slave"
              }
            },
            spec: {
              affinity: withPodAntiAffinityRequired({
                app: "redis",
                role: "slave"
              }),
              containers: [
                {
                  name: "slave",
                  image: DockerImages.redis,
                  resources: {
                    requests: {
                      cpu: "100m",
                      memory: "100Mi"
                    }
                  },
                  env: [
                    {
                      name: "REDIS_REPLICATION_MODE",
                      value: "slave"
                    },
                    {
                      name: "REDIS_MASTER_HOST",
                      value: `redis-master.${namespace}.svc.cluster.local`
                    },
                    {
                      name: "REDIS_MASTER_PASSWORD",
                      valueFrom: {
                        secretKeyRef: {
                          name: "redis-password",
                          key: "REDIS_MASTER_PASSWORD"
                        }
                      }
                    },
                    {
                      name: "REDIS_PASSWORD",
                      valueFrom: {
                        secretKeyRef: {
                          name: "redis-password",
                          key: "REDIS_SLAVE_PASSWORD"
                        }
                      }
                    }
                  ],
                  ports: [
                    {
                      containerPort: 6379
                    }
                  ]
                }
              ]
            }
          }
        }
      },
      kubeConfig
    )
  );
  return collection;
}
