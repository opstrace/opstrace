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

import {
  ResourceCollection,
  Service,
  V1ServicemonitorResource
} from "@opstrace/kubernetes";
import { KubeConfig } from "@kubernetes/client-node";

export function ControllerServiceMonitorResources(
  kubeConfig: KubeConfig,
  namespace: string
): ResourceCollection {
  const collection = new ResourceCollection();

  // Have the controller create a Service that points back to itself.
  // This is required for the controller ServiceMonitor below to work.
  collection.add(
    new Service(
      {
        apiVersion: "v1",
        kind: "Service",
        metadata: {
          labels: {
            name: "opstrace-controller",
            tenant: "system"
          },
          name: "opstrace-controller",
          namespace: "kube-system"
        },
        spec: {
          ports: [
            {
              name: "metrics",
              port: 8900,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: "metrics" as any
            }
          ],
          selector: {
            name: "opstrace-controller"
          }
        }
      },
      kubeConfig
    )
  );

  // ServiceMonitor in system-tenant that scrapes the Service in kube-system.
  collection.add(
    new V1ServicemonitorResource(
      {
        apiVersion: "monitoring.coreos.com/v1",
        kind: "ServiceMonitor",
        metadata: {
          labels: {
            name: "opstrace-controller",
            tenant: "system"
          },
          name: "opstrace-controller",
          namespace
        },
        spec: {
          endpoints: [
            {
              interval: "30s",
              port: "metrics"
            }
          ],
          jobLabel: "name",
          namespaceSelector: {
            matchNames: ["kube-system"]
          },
          selector: {
            matchLabels: {
              name: "opstrace-controller"
            }
          }
        }
      },
      kubeConfig
    )
  );

  return collection;
}
