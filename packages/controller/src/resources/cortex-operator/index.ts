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
  CustomResourceDefinition,
  ResourceCollection,
  Namespace,
  cortices,
  ServiceAccount,
  Role,
  ClusterRole,
  RoleBinding,
  ClusterRoleBinding,
  ConfigMap,
  Service,
  Deployment,
  V1CertificateResource,
  V1IssuerResource,
  K8sResource
} from "@opstrace/kubernetes";

import { State } from "../../reducer";

export function CortexOperatorResources(
  state: State,
  kubeConfig: KubeConfig,
  namespace: string
): ResourceCollection {
  const collection = new ResourceCollection();

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

  collection.add(new CustomResourceDefinition(cortices, kubeConfig));

  collection.add(
    new ServiceAccount(
      {
        apiVersion: "v1",
        kind: "ServiceAccount",
        metadata: {
          name: "cortex-operator-controller-manager",
          namespace
        }
      },
      kubeConfig
    )
  );

  collection.add(
    new Role(
      {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "Role",
        metadata: {
          name: "cortex-operator-leader-election-role",
          namespace: namespace
        },
        rules: [
          {
            apiGroups: [""],
            resources: ["configmaps"],
            verbs: [
              "get",
              "list",
              "watch",
              "create",
              "update",
              "patch",
              "delete"
            ]
          },
          {
            apiGroups: ["coordination.k8s.io"],
            resources: ["leases"],
            verbs: [
              "get",
              "list",
              "watch",
              "create",
              "update",
              "patch",
              "delete"
            ]
          },
          {
            apiGroups: [""],
            resources: ["events"],
            verbs: ["create", "patch"]
          }
        ]
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
          name: "cortex-operator-manager-role"
        },
        rules: [
          {
            apiGroups: [""],
            resources: ["configmaps"],
            verbs: [
              "create",
              "delete",
              "get",
              "list",
              "patch",
              "scope=Cluster",
              "update",
              "watch"
            ]
          },
          {
            apiGroups: [""],
            resources: ["serviceaccounts"],
            verbs: [
              "create",
              "delete",
              "get",
              "list",
              "patch",
              "scope=Cluster",
              "update",
              "watch"
            ]
          },
          {
            apiGroups: [""],
            resources: ["services"],
            verbs: [
              "create",
              "delete",
              "get",
              "list",
              "patch",
              "scope=Cluster",
              "update",
              "watch"
            ]
          },
          {
            apiGroups: ["apps"],
            resources: ["deployments"],
            verbs: [
              "create",
              "delete",
              "get",
              "list",
              "patch",
              "scope=Cluster",
              "update",
              "watch"
            ]
          },
          {
            apiGroups: ["apps"],
            resources: ["statefulsets"],
            verbs: [
              "create",
              "delete",
              "get",
              "list",
              "patch",
              "scope=Cluster",
              "update",
              "watch"
            ]
          },
          {
            apiGroups: ["cortex.opstrace.io"],
            resources: ["cortices"],
            verbs: [
              "create",
              "delete",
              "get",
              "list",
              "patch",
              "update",
              "watch"
            ]
          },
          {
            apiGroups: ["cortex.opstrace.io"],
            resources: ["cortices/finalizers"],
            verbs: ["update"]
          },
          {
            apiGroups: ["cortex.opstrace.io"],
            resources: ["cortices/status"],
            verbs: ["get", "patch", "update"]
          }
        ]
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
          name: "cortex-operator-metrics-reader"
        },
        rules: [
          {
            nonResourceURLs: ["/metrics"],
            verbs: ["get"]
          }
        ]
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
          name: "cortex-operator-proxy-role"
        },
        rules: [
          {
            apiGroups: ["authentication.k8s.io"],
            resources: ["tokenreviews"],
            verbs: ["create"]
          },
          {
            apiGroups: ["authorization.k8s.io"],
            resources: ["subjectaccessreviews"],
            verbs: ["create"]
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
          name: "cortex-operator-leader-election-rolebinding",
          namespace: namespace
        },
        roleRef: {
          apiGroup: "rbac.authorization.k8s.io",
          kind: "Role",
          name: "cortex-operator-leader-election-role"
        },
        subjects: [
          {
            apiGroup: "",
            kind: "ServiceAccount",
            name: "cortex-operator-controller-manager",
            namespace
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
          name: "cortex-operator-manager-rolebinding"
        },
        roleRef: {
          apiGroup: "rbac.authorization.k8s.io",
          kind: "ClusterRole",
          name: "cortex-operator-manager-role"
        },
        subjects: [
          {
            kind: "ServiceAccount",
            name: "cortex-operator-controller-manager",
            namespace
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
          name: "cortex-operator-proxy-rolebinding"
        },
        roleRef: {
          apiGroup: "rbac.authorization.k8s.io",
          kind: "ClusterRole",
          name: "cortex-operator-proxy-role"
        },
        subjects: [
          {
            kind: "ServiceAccount",
            name: "cortex-operator-controller-manager",
            namespace
          }
        ]
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
          name: "cortex-operator-manager-config",
          namespace
        },
        data: {
          "controller_manager_config.yaml": `
apiVersion: controller-runtime.sigs.k8s.io/v1alpha1
kind: ControllerManagerConfig
health:
  healthProbeBindAddress: :8081
metrics:
  bindAddress: 127.0.0.1:8080
webhook:
  port: 9443
leaderElection:
  leaderElect: true
  resourceName: 5b355f38.opstrace.com
          `
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
            "control-plane": "controller-manager"
          },
          name: "cortex-operator-controller-manager-metrics-service",
          namespace
        },
        spec: {
          ports: [
            {
              name: "https",
              port: 8443,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: "https" as any
            }
          ],
          selector: {
            "control-plane": "controller-manager"
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
            "control-plane": "controller-manager"
          },
          name: "cortex-operator-webhook-service",
          namespace
        },
        spec: {
          ports: [
            {
              port: 443,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: 9443 as any
            }
          ],
          selector: {
            "control-plane": "controller-manager"
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
          name: "cortex-operator-controller-mananager",
          namespace,
          labels: {
            "control-plane": "controller-manager"
          }
        },
        spec: {
          minReadySeconds: 10,
          replicas: 1,
          revisionHistoryLimit: 10,
          selector: {
            matchLabels: {
              "control-plane": "controller-manager"
            }
          },
          strategy: {
            rollingUpdate: {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              maxSurge: "25%" as any,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              maxUnavailable: "25%" as any
            },
            type: "RollingUpdate"
          },
          template: {
            metadata: {
              labels: {
                "control-plane": "controller-manager"
              }
            },
            spec: {
              containers: [
                {
                  args: [
                    "--secure-listen-address=0.0.0.0:8443",
                    "--upstream=http://127.0.0.1:8080/",
                    "--logtostderr=true",
                    "--v=10"
                  ],
                  image: "gcr.io/kubebuilder/kube-rbac-proxy:v0.8.0",
                  imagePullPolicy: "IfNotPresent",
                  name: "kube-rbac-proxy",
                  ports: [
                    {
                      containerPort: 8443,
                      name: "https",
                      protocol: "TCP"
                    }
                  ],
                  resources: {},
                  terminationMessagePath: "/dev/termination-log",
                  terminationMessagePolicy: "File"
                },
                {
                  args: [
                    "--health-probe-bind-address=:8081",
                    "--metrics-bind-address=127.0.0.1:8080",
                    "--leader-elect"
                  ],
                  command: ["/manager"],
                  image: "sreis/cortex-operator:1",
                  imagePullPolicy: "IfNotPresent",
                  livenessProbe: {
                    failureThreshold: 3,
                    httpGet: {
                      path: "/healthz",
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      port: 8081 as any,
                      scheme: "HTTP"
                    },
                    initialDelaySeconds: 15,
                    periodSeconds: 10,
                    successThreshold: 1,
                    timeoutSeconds: 1
                  },
                  name: "manager",
                  ports: [
                    {
                      containerPort: 9443,
                      name: "webhook-server",
                      protocol: "TCP"
                    }
                  ],
                  readinessProbe: {
                    failureThreshold: 3,
                    httpGet: {
                      path: "/readyz",
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      port: 8081 as any,
                      scheme: "HTTP"
                    },
                    initialDelaySeconds: 15,
                    periodSeconds: 10,
                    successThreshold: 1,
                    timeoutSeconds: 1
                  },
                  resources: {
                    limits: {
                      cpu: "100m",
                      memory: "120Mi"
                    },
                    requests: {
                      cpu: "100m",
                      memory: "20Mi"
                    }
                  },
                  securityContext: {
                    allowPrivilegeEscalation: false
                  },
                  terminationMessagePath: "/dev/termination-log",
                  terminationMessagePolicy: "File",
                  volumeMounts: [
                    {
                      mountPath: "/tmp/k8s-webhook-server/serving-certs",
                      name: "cert",
                      readOnly: true
                    }
                  ]
                }
              ],
              securityContext: {
                runAsNonRoot: true
              },
              serviceAccount: "cortex-operator-controller-manager",
              serviceAccountName: "cortex-operator-controller-manager",
              terminationGracePeriodSeconds: 10,
              volumes: [
                {
                  name: "cert",
                  secret: {
                    defaultMode: 420,
                    secretName: "webhook-server-cert"
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
    new V1CertificateResource(
      {
        apiVersion: "cert-manager.io/v1",
        kind: "Certificate",
        metadata: {
          name: "cortex-operator-serving-cert",
          namespace: namespace
        },
        spec: {
          dnsNames: [
            "cortex-operator-webhook-service.cortex-operator-system.svc",
            "cortex-operator-webhook-service.cortex-operator-system.svc.cluster.local"
          ],
          issuerRef: {
            name: "cortex-operator-selfsigned-issuer",
            kind: "Issuer"
          },
          secretName: "webhook-server-cert"
        }
      },
      kubeConfig
    )
  );

  collection.add(
    new V1IssuerResource(
      {
        apiVersion: "cert-manager.io/v1",
        kind: "Issuer",
        metadata: {
          name: "cortex-operator-selfsigned-issuer",
          namespace: namespace
        },
        spec: {
          selfSigned: {}
        }
      },
      kubeConfig
    )
  );

  collection.add(
    new K8sResource(
      {
        apiVersion: "admissionregistration.k8s.io/v1beta1",
        kind: "MutatingWebhookConfiguration",
        metadata: {
          annotations: {
            "cert-manager.io/inject-ca-from":
              "cortex-operator-system/cortex-operator-serving-cert"
          },
          name: "cortex-operator-mutating-webhook-configuration"
        },
        webhooks: [
          {
            admissionReviewVersions: ["v1", "v1beta1"],
            clientConfig: {
              service: {
                name: "cortex-operator-webhook-service",
                namespace: "cortex-operator-system",
                path: "/mutate-cortex-opstrace-io-v1alpha1-cortex"
              }
            },
            failurePolicy: "Fail",
            name: "mcortex.kb.io",
            rules: [
              {
                apiGroups: ["cortex.opstrace.io"],
                apiVersions: ["v1alpha1"],
                operations: ["CREATE", "UPDATE"],
                resources: ["cortices"]
              }
            ],
            sideEffects: "None"
          }
        ]
      },
      kubeConfig
    )
  );

  collection.add(
    new K8sResource(
      {
        apiVersion: "admissionregistration.k8s.io/v1beta1",
        kind: "ValidatingWebhookConfiguration",
        metadata: {
          annotations: {
            "cert-manager.io/inject-ca-from":
              "cortex-operator-system/cortex-operator-serving-cert"
          },
          name: "cortex-operator-validating-webhook-configuration"
        },
        webhooks: [
          {
            admissionReviewVersions: ["v1", "v1beta1"],
            clientConfig: {
              service: {
                name: "cortex-operator-webhook-service",
                namespace: "cortex-operator-system",
                path: "/validate-cortex-opstrace-io-v1alpha1-cortex"
              }
            },
            failurePolicy: "Fail",
            name: "vcortex.kb.io",
            rules: [
              {
                apiGroups: ["cortex.opstrace.io"],
                apiVersions: ["v1alpha1"],
                operations: ["CREATE", "UPDATE"],
                resources: ["cortices"]
              }
            ],
            sideEffects: "None"
          }
        ]
      },
      kubeConfig
    )
  );

  return collection;
}
