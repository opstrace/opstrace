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

import { State } from "../../reducer";
import { KubeConfig } from "@kubernetes/client-node";
import { DockerImages } from "@opstrace/controller-config";
import {
  ClusterRole,
  ClusterRoleBinding,
  Deployment,
  ResourceCollection,
  RoleBinding,
  Secret,
  Service,
  ServiceAccount,
  V1CertificateResource
} from "@opstrace/kubernetes";

import { getControllerConfig } from "../../helpers";

export function KubedResources(
  state: State,
  kubeConfig: KubeConfig,
  namespace: string
): ResourceCollection {
  const collection = new ResourceCollection();

  const { infrastructureName } = getControllerConfig(state);

  // Generate the certs that allow the
  // kube-apiserver (and potentially ServiceMonitor) to authenticate operators
  // pods.
  collection.add(
    new V1CertificateResource(
      {
        apiVersion: "cert-manager.io/v1",
        kind: "Certificate",
        metadata: {
          name: "kubed-apiserver-cert",
          namespace: namespace
        },
        spec: {
          secretName: "kubed-apiserver-cert",
          commonName: "kubed-apiserver-root-ca",
          isCA: true,
          issuerRef: {
            name: "selfsigning-issuer",
            kind: "ClusterIssuer"
          }
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
          name: "kubed",
          namespace,
          labels: {
            app: "kubed",
            "app.kubernetes.io/instance": "kubed",
            "app.kubernetes.io/name": "kubed"
          }
        }
      },
      kubeConfig
    )
  );

  collection.add(
    new Secret(
      {
        apiVersion: "v1",
        // When required define kubed configuration here.
        data: undefined,
        kind: "Secret",
        metadata: {
          name: "kubed",
          namespace: namespace
        },
        type: "Opaque"
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
          labels: {
            app: "kubed",
            "app.kubernetes.io/instance": "kubed",
            "app.kubernetes.io/name": "kubed"
          },
          name: "kubed"
        },
        rules: [
          {
            apiGroups: [""],
            resources: ["configmaps", "secrets"],
            verbs: ["get", "create", "patch", "delete", "list", "watch"]
          },
          {
            apiGroups: [""],
            resources: ["namespaces"],
            verbs: ["get", "list", "watch"]
          },
          {
            apiGroups: [""],
            resources: ["nodes"],
            verbs: ["list"]
          },
          {
            apiGroups: [""],
            resources: ["events"],
            verbs: ["create"]
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
          labels: {
            app: "kubed",
            "app.kubernetes.io/instance": "kubed",
            "app.kubernetes.io/name": "kubed"
          },
          name: "kubed"
        },
        roleRef: {
          apiGroup: "rbac.authorization.k8s.io",
          kind: "ClusterRole",
          name: "kubed"
        },
        subjects: [
          {
            kind: "ServiceAccount",
            name: "kubed",
            namespace
          }
        ]
      },
      kubeConfig
    )
  );

  collection.add(
    new RoleBinding(
      {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "RoleBinding",
        metadata: {
          labels: {
            app: "kubed",
            "app.kubernetes.io/instance": "kubed",
            "app.kubernetes.io/name": "kubed"
          },
          name: "kubed-apiserver-extension-server-authentication-reader",
          namespace: "kube-system"
        },
        roleRef: {
          apiGroup: "rbac.authorization.k8s.io",
          kind: "Role",
          name: "extension-apiserver-authentication-reader"
        },
        subjects: [
          {
            kind: "ServiceAccount",
            name: "kubed",
            namespace
          }
        ]
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
            app: "kubed",
            "app.kubernetes.io/instance": "kubed",
            "app.kubernetes.io/name": "kubed"
          },
          name: "kubed",
          namespace
        },
        spec: {
          ports: [
            {
              port: 443,
              protocol: "TCP",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: 8443 as any
            }
          ],
          selector: {
            "app.kubernetes.io/instance": "kubed",
            "app.kubernetes.io/name": "kubed"
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
          labels: {
            app: "kubed",
            "app.kubernetes.io/instance": "kubed",
            "app.kubernetes.io/name": "kubed"
          },
          name: "kubed",
          namespace
        },
        spec: {
          replicas: 1,
          selector: {
            matchLabels: {
              "app.kubernetes.io/instance": "kubed",
              "app.kubernetes.io/name": "kubed"
            }
          },
          template: {
            metadata: {
              labels: {
                app: "kubed",
                "app.kubernetes.io/instance": "kubed",
                "app.kubernetes.io/name": "kubed"
              }
            },
            spec: {
              containers: [
                {
                  name: "kubed",
                  image: DockerImages.kubed,
                  imagePullPolicy: "IfNotPresent",
                  // https://appscode.com/products/kubed/v0.12.0/reference/kubed/
                  args: [
                    "run",
                    "--v=3",
                    "--secure-port=8443",
                    "--audit-log-path=-",
                    "--tls-cert-file=/var/serving-cert/tls.crt",
                    "--tls-private-key-file=/var/serving-cert/tls.key",
                    // if true, uses kube-apiserver FQDN for AKS cluster to
                    // workaround https://github.com/Azure/AKS/issues/522
                    // (default true)
                    // Not required since we don't support Azure.
                    "--use-kubeapiserver-fqdn-for-aks=false",
                    "--enable-analytics=false",
                    `--cluster-name=${infrastructureName}`
                  ],
                  ports: [
                    {
                      containerPort: 8443
                    }
                  ],
                  volumeMounts: [
                    {
                      name: "config",
                      mountPath: "/srv/kubed"
                    },
                    {
                      name: "scratch",
                      mountPath: "/tmp"
                    },
                    {
                      name: "serving-cert",
                      mountPath: "/var/serving-cert"
                    }
                  ]
                }
              ],
              volumes: [
                {
                  name: "config",
                  secret: {
                    secretName: "kubed"
                  }
                },
                {
                  name: "scratch",
                  emptyDir: {}
                },
                {
                  name: "serving-cert",
                  secret: {
                    defaultMode: 420,
                    secretName: "kubed-apiserver-cert"
                  }
                }
              ],
              serviceAccountName: "kubed"
            }
          }
        }
      },
      kubeConfig
    )
  );

  return collection;
}
