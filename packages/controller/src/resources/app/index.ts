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

import { Ingress } from "@opstrace/kubernetes";
import { KubeConfig } from "@kubernetes/client-node";

import { ResourceCollection } from "@opstrace/kubernetes";
import { State } from "../../reducer";
import { getDomain } from "../../helpers";

import { OpstraceAPIResources } from "./api";
import { OpstraceApplicationResources } from "./app";

export function ApplicationResources(
  state: State,
  kubeConfig: KubeConfig,
  namespace: string
): ResourceCollection {
  const collection = new ResourceCollection();

  const domain = getDomain(state);

  // App UI
  collection.add(OpstraceApplicationResources(state, kubeConfig, namespace, domain));
  // Config API
  collection.add(OpstraceAPIResources(state, kubeConfig, namespace));

  // Ingress for the root domain, shared by the App UI and Config API
  collection.add(
    new Ingress(
      {
        apiVersion: "networking.k8s.io/v1beta1",
        kind: "Ingress",
        metadata: {
          name: "opstrace-root",
          namespace,
          annotations: {
            "kubernetes.io/ingress.class": "ui",
            "external-dns.alpha.kubernetes.io/ttl": "30",
            "nginx.ingress.kubernetes.io/client-body-buffer-size": "10m"
          }
        },
        spec: {
          tls: [
            {
              hosts: [domain],
              secretName: "https-cert"
            }
          ],
          rules: [
            {
              host: domain,
              http: {
                paths: [
                  // Route everything except /api/* to the application
                  {
                    backend: {
                      serviceName: "opstrace-application",
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      servicePort: "http" as any
                    },
                    pathType: "Prefix",
                    path: "/"
                  },
                  // Separate routing reserved for /api/*
                  {
                    backend: {
                      serviceName: "opstrace-api",
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      servicePort: "http" as any
                    },
                    pathType: "Prefix",
                    path: "/api/"
                  }
                ]
              }
            }
          ]
        }
      },
      kubeConfig
    )
  );

  return collection;
}
