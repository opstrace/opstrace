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
import { strict as assert } from "assert";
import {
  ResourceCollection,
  ServiceAccount,
  ClusterRole,
  ClusterRoleBinding,
  Deployment
} from "@opstrace/kubernetes";
import { getControllerConfig, getDomain } from "../../helpers";
import { State } from "../../reducer";
import { DockerImages, getImagePullSecrets } from "@opstrace/controller-config";

export function ExternalDnsResources(
  state: State,
  kubeConfig: KubeConfig,
  namespace: string
): ResourceCollection {
  const collection = new ResourceCollection();

  const domain = getDomain(state);
  const { target } = getControllerConfig(state);
  let platformProvider = null;

  if (target === "gcp") {
    platformProvider = "google";
  }
  if (target === "aws") {
    platformProvider = "aws";
  }

  let annotations = {};
  if (target == "gcp") {
    assert(state.config.config?.gcp?.externalDNSServiceAccount);
    annotations = {
      "iam.gke.io/gcp-service-account":
        state.config.config.gcp.externalDNSServiceAccount
    };
  }

  collection.add(
    new ServiceAccount(
      {
        apiVersion: "v1",
        kind: "ServiceAccount",
        metadata: {
          name: "external-dns",
          namespace,
          annotations: annotations
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
          name: "external-dns"
        },
        rules: [
          {
            apiGroups: [""],
            resources: ["endpoints", "pods", "services"],
            verbs: ["get", "watch", "list"]
          },
          {
            apiGroups: ["extensions"],
            resources: ["ingresses"],
            verbs: ["get", "watch", "list"]
          },
          {
            apiGroups: [""],
            resources: ["nodes"],
            verbs: ["list"]
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
          name: "external-dns-viewer",
          namespace
        },
        roleRef: {
          apiGroup: "rbac.authorization.k8s.io",
          kind: "ClusterRole",
          name: "external-dns"
        },
        subjects: [
          {
            kind: "ServiceAccount",
            name: "external-dns",
            namespace
          }
        ]
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
          name: "external-dns",
          namespace
        },
        spec: {
          strategy: {
            type: "Recreate"
          },
          selector: {
            matchLabels: {
              app: "external-dns"
            }
          },
          template: {
            metadata: {
              labels: {
                app: "external-dns"
              }
            },
            spec: {
              imagePullSecrets: getImagePullSecrets(),
              serviceAccountName: "external-dns",
              containers: [
                {
                  name: "external-dns",
                  image: DockerImages.externalDNS,
                  args: [
                    "--source=service",
                    "--source=ingress",
                    `--domain-filter=${domain}`,
                    `--provider=${platformProvider}`,
                    "--registry=txt",
                    `--txt-owner-id=${domain}`,
                    "--log-level=info"
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
