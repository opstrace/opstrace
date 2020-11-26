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

import {
  ResourceCollection,
  StorageClass,
  ConfigMap,
  DaemonSet,
  ServiceAccount,
  ClusterRoleBinding,
  ClusterRole
} from "@opstrace/kubernetes";
import { State } from "../../reducer";
import { KubeConfig } from "@kubernetes/client-node";
import { DockerImages } from "@opstrace/controller-config";

export function StorageResources(
  state: State,
  kubeConfig: KubeConfig
): ResourceCollection {
  const collection = new ResourceCollection();
  const provisionerName = "local-volume-provisioner";
  const serviceAccountName = `${provisionerName}-sa`;

  collection.add(
    new StorageClass(
      {
        apiVersion: "storage.k8s.io/v1",
        kind: "StorageClass",
        metadata: {
          name: "local-scsi"
        },
        provisioner: "kubernetes.io/no-provisioner",
        volumeBindingMode: "WaitForFirstConsumer"
      },
      kubeConfig
    )
  );

  collection.add(
    new StorageClass(
      {
        apiVersion: "storage.k8s.io/v1",
        kind: "StorageClass",
        metadata: {
          name: "pd-ssd"
        },
        parameters: {
          type: "pd-ssd"
        },
        provisioner: "kubernetes.io/gce-pd",
        volumeBindingMode: "WaitForFirstConsumer"
      },
      kubeConfig
    )
  );

  collection.add(
    new ConfigMap(
      {
        apiVersion: "v1",
        kind: "ConfigMap",
        metadata: {
          name: provisionerName
        },
        data: {
          useNodeNameOnly: "true",
          storageClassMap: `local-scsi:\n   hostDir: /mnt/disks\n   mountDir:  /mnt/disks\n`
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
          name: serviceAccountName
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
          name: `${provisionerName}-node-clusterrole`
        },
        rules: [
          {
            apiGroups: [""],
            resources: ["nodes"],
            verbs: ["get"]
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
          name: `${provisionerName}-pv-binding`
        },
        subjects: [
          {
            kind: "ServiceAccount",
            name: `${provisionerName}-sa`,
            namespace: "default"
          }
        ],
        roleRef: {
          kind: "ClusterRole",
          name: "system:persistent-volume-provisioner",
          apiGroup: "rbac.authorization.k8s.io"
        }
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
          name: `${provisionerName}-node-binding`
        },
        subjects: [
          {
            kind: "ServiceAccount",
            name: `${provisionerName}-sa`,
            namespace: "default"
          }
        ],
        roleRef: {
          kind: "ClusterRole",
          name: `${provisionerName}-node-clusterrole`,
          apiGroup: "rbac.authorization.k8s.io"
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
          name: provisionerName,
          labels: {
            app: provisionerName
          }
        },
        spec: {
          selector: {
            matchLabels: {
              app: provisionerName
            }
          },
          template: {
            metadata: {
              labels: {
                app: provisionerName
              }
            },
            spec: {
              serviceAccountName: `${provisionerName}-sa`,
              containers: [
                {
                  image: DockerImages.localVolumeProvisioner,
                  imagePullPolicy: "Always",
                  name: "provisioner",
                  securityContext: {
                    privileged: true
                  },
                  env: [
                    {
                      name: "MY_NODE_NAME",
                      valueFrom: {
                        fieldRef: {
                          fieldPath: "spec.nodeName"
                        }
                      }
                    }
                  ],
                  volumeMounts: [
                    {
                      mountPath: "/etc/provisioner/config",
                      name: "provisioner-config",
                      readOnly: true
                    },
                    {
                      mountPath: "/mnt/disks",
                      name: "local-scsi"
                    }
                  ]
                }
              ],
              volumes: [
                {
                  name: "provisioner-config",
                  configMap: {
                    name: provisionerName
                  }
                },
                {
                  name: "local-scsi",
                  hostPath: {
                    path: "/mnt/disks"
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

  return collection;
}
