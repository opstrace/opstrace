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
  Service,
  ServiceAccount,
  ClusterRole,
  ClusterRoleBinding,
  Deployment,
  CustomResourceDefinition,
  V1ServicemonitorResource,
  podmonitor,
  prometheus,
  prometheusrule,
  servicemonitor,
  alertmanager,
  thanosruler,
  probe
} from "@opstrace/kubernetes";

import { State } from "../../reducer";
import { KubeConfig } from "@kubernetes/client-node";
import { DockerImages } from "@opstrace/controller-config";

export function PrometheusOperatorResources(
  state: State,
  kubeConfig: KubeConfig,
  namespace: string
): ResourceCollection {
  const collection = new ResourceCollection();

  collection.add(new CustomResourceDefinition(alertmanager, kubeConfig));
  collection.add(new CustomResourceDefinition(podmonitor, kubeConfig));
  collection.add(new CustomResourceDefinition(prometheus, kubeConfig));
  collection.add(new CustomResourceDefinition(prometheusrule, kubeConfig));
  collection.add(new CustomResourceDefinition(servicemonitor, kubeConfig));
  collection.add(new CustomResourceDefinition(probe, kubeConfig));
  collection.add(new CustomResourceDefinition(thanosruler, kubeConfig));

  const prometheusOperatorVersion = DockerImages.prometheusOperator.split(
    ":"
  )[1];

  collection.add(
    new V1ServicemonitorResource(
      {
        apiVersion: "monitoring.coreos.com/v1",
        kind: "ServiceMonitor",
        metadata: {
          labels: {
            "app.kubernetes.io/component": "controller",
            "app.kubernetes.io/name": "prometheus-operator",
            "app.kubernetes.io/version": prometheusOperatorVersion,
            tenant: "system"
          },
          name: "prometheus-operator",
          namespace
        },
        spec: {
          endpoints: [
            {
              honorLabels: true,
              port: "http"
            }
          ],
          selector: {
            matchLabels: {
              "app.kubernetes.io/component": "controller",
              "app.kubernetes.io/name": "prometheus-operator",
              "app.kubernetes.io/version": prometheusOperatorVersion
            }
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
          labels: {
            "app.kubernetes.io/component": "controller",
            "app.kubernetes.io/name": "prometheus-operator",
            "app.kubernetes.io/version": prometheusOperatorVersion
          },
          name: "prometheus-operator",
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
            "app.kubernetes.io/component": "controller",
            "app.kubernetes.io/name": "prometheus-operator",
            "app.kubernetes.io/version": prometheusOperatorVersion
          },
          name: "prometheus-operator",
          namespace
        },
        spec: {
          clusterIP: "None",
          ports: [
            {
              name: "http",
              port: 8443,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: "https" as any
            }
          ],
          selector: {
            "app.kubernetes.io/component": "controller",
            "app.kubernetes.io/name": "prometheus-operator"
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
            "app.kubernetes.io/component": "controller",
            "app.kubernetes.io/name": "prometheus-operator",
            "app.kubernetes.io/version": prometheusOperatorVersion
          },
          name: "prometheus-operator",
          namespace
        },
        spec: {
          replicas: 1,
          selector: {
            matchLabels: {
              "app.kubernetes.io/component": "controller",
              "app.kubernetes.io/name": "prometheus-operator"
            }
          },
          template: {
            metadata: {
              labels: {
                "app.kubernetes.io/component": "controller",
                "app.kubernetes.io/name": "prometheus-operator",
                "app.kubernetes.io/version": prometheusOperatorVersion
              }
            },
            spec: {
              containers: [
                {
                  args: [
                    "--kubelet-service=kube-system/kubelet",
                    "--config-reloader-image=jimmidyson/configmap-reload:v0.4.0",
                    "--prometheus-config-reloader=quay.io/prometheus-operator/prometheus-config-reloader:v0.42.1"
                  ],
                  image: DockerImages.prometheusOperator,
                  name: "prometheus-operator",
                  ports: [
                    {
                      containerPort: 8080,
                      name: "http"
                    }
                  ],
                  resources: {
                    limits: {
                      cpu: "200m",
                      memory: "200Mi"
                    },
                    requests: {
                      cpu: "100m",
                      memory: "100Mi"
                    }
                  },
                  securityContext: {
                    allowPrivilegeEscalation: false
                  }
                },
                {
                  args: [
                    "--secure-listen-address=:8443",
                    "--tls-cipher-suites=TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305,TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305",
                    "--upstream=http://127.0.0.1:8080/"
                  ],
                  image: "quay.io/brancz/kube-rbac-proxy:v0.6.0",
                  name: "kube-rbac-proxy",
                  ports: [
                    {
                      containerPort: 8443,
                      name: "https"
                    }
                  ],
                  securityContext: {
                    runAsUser: 65534
                  }
                }
              ],
              nodeSelector: {
                "beta.kubernetes.io/os": "linux"
              },
              securityContext: {
                runAsNonRoot: true,
                runAsUser: 65534
              },
              serviceAccountName: "prometheus-operator"
            }
          }
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
          labels: {
            "app.kubernetes.io/component": "controller",
            "app.kubernetes.io/name": "prometheus-operator",
            "app.kubernetes.io/version": "v0.42.1"
          },
          name: "prometheus-operator"
        },
        rules: [
          {
            apiGroups: ["monitoring.coreos.com"],
            resources: [
              "alertmanagers",
              "alertmanagers/finalizers",
              "prometheuses",
              "prometheuses/finalizers",
              "thanosrulers",
              "thanosrulers/finalizers",
              "servicemonitors",
              "podmonitors",
              "probes",
              "prometheusrules"
            ],
            verbs: ["*"]
          },
          {
            apiGroups: ["apps"],
            resources: ["statefulsets"],
            verbs: ["*"]
          },
          {
            apiGroups: [""],
            resources: ["configmaps", "secrets"],
            verbs: ["*"]
          },
          {
            apiGroups: [""],
            resources: ["pods"],
            verbs: ["list", "delete"]
          },
          {
            apiGroups: [""],
            resources: ["services", "services/finalizers", "endpoints"],
            verbs: ["get", "create", "update", "delete"]
          },
          {
            apiGroups: [""],
            resources: ["nodes"],
            verbs: ["list", "watch"]
          },
          {
            apiGroups: [""],
            resources: ["namespaces"],
            verbs: ["get", "list", "watch"]
          },
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
    new ClusterRoleBinding(
      {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "ClusterRoleBinding",
        metadata: {
          labels: {
            "app.kubernetes.io/component": "controller",
            "app.kubernetes.io/name": "prometheus-operator",
            "app.kubernetes.io/version": "v0.42.1"
          },
          name: "prometheus-operator"
        },
        roleRef: {
          apiGroup: "rbac.authorization.k8s.io",
          kind: "ClusterRole",
          name: "prometheus-operator"
        },
        subjects: [
          {
            kind: "ServiceAccount",
            name: "prometheus-operator",
            namespace
          }
        ]
      },
      kubeConfig
    )
  );

  return collection;
}
