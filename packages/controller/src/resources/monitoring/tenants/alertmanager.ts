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
import { State } from "../../../reducer";
import { Tenant } from "@opstrace/tenants";
import {
  getAlertmanagerName,
  getDomain,
  getTenantNamespace
} from "../../../helpers";
import * as yaml from "js-yaml";
import {
  ResourceCollection,
  Secret,
  Service,
  ServiceAccount,
  V1AlertmanagerResource,
  V1ServicemonitorResource
} from "@opstrace/kubernetes";

export function AlertManagerResources(
  state: State,
  kubeConfig: KubeConfig,
  tenant: Tenant
): ResourceCollection {
  const collection = new ResourceCollection();

  const domain = getDomain(state);
  // TODO (clambert) create a getCurrentAlertConfig helper
  // TODO(mat): reenable
  //const alertConfig = getCurrentStack(state).alertConfig;

  const namespace = getTenantNamespace(tenant);
  const name = getAlertmanagerName(tenant);

  type AlertManagerRoute = {
    receiver: string;
    group_by: string[];
    repeat_interval?: string;
    match: {
      severity?: string;
      alertname?: string;
    };
    continue: boolean;
  };

  const alertManagerRoutes: AlertManagerRoute[] = [
    // {
    //   receiver: "slack-notifications",
    //   repeat_interval: "2m",
    //   group_by: ["alertname"],
    //   match: {},
    //   continue: true
    // }
  ];

  // if (alertConfig.credentials.pagerDutyKey) {
  //   alertManagerRoutes.unshift({
  //     receiver: "pagerduty",
  //     group_by: ["alertname"],
  //     match: {
  //       severity: "critical"
  //     },
  //     continue: true
  //   } as AlertManagerRoute);
  // }

  // if (alertConfig.watchdogUrl) {
  //   alertManagerRoutes.unshift({
  //     receiver: "pagerduty-watchdog",
  //     repeat_interval: "5m",
  //     match: {
  //       alertname: "Watchdog"
  //     },
  //     continue: false
  //   } as AlertManagerRoute);
  // }

  const alertManagerConfig = {
    global: {
      //slack_api_url: alertConfig.credentials.slackHookUrl
    },
    route: {
      // This "blackhole" receiver allows us to completely ignore some alerts.  I.e., if an alert
      // does not match any of the conditions in the routes array, it will default to the root
      // receiver—"blackhole"—which goes nowhere.
      receiver: "blackhole",
      routes: alertManagerRoutes
    },
    receivers: [
      {
        name: "blackhole"
      }
      // {
      //   name: "slack-notifications",
      //   slack_configs: [
      //     {
      //       title: `[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }} - (${
      //         getCurrentStack(state).org
      //       }-${getCurrentStack(state).name})\n`,
      //       title_link: `http://system.${domain}/alertmanager/#/alerts?receiver=slack-notifications`,
      //       channel: alertConfig.slackChannelName,
      //       text:
      //         "{{ with index .Alerts 0 -}}\n  :chart_with_upwards_trend: *<{{- if .Annotations.graph }}{{ .Annotations.graph }}{{else}}{{ .GeneratorURL }}#graph0{{end}}|Graph>*   {{- if .Annotations.dashboard }} :dashboard: *<{{ .Annotations.dashboard }}|Dashboard>*{{ end }}{{- if .Annotations.runbook_url }} :notebook: *<{{ .Annotations.runbook_url }}|Runbook>*{{ end }}\n{{ end }}\n*Alert details*:\n{{ range .Alerts -}}\n  *Alert:* {{ .Annotations.title }}{{ if .Labels.severity }} - `{{ .Labels.severity }}`{{ end }}\n*Description:* {{ .Annotations.description }} *Details:*\n  {{ range .Labels.SortedPairs }} • *{{ .Name }}:* `{{ .Value }}`\n  {{ end }}\n{{ end }}"
      //     }
      //   ]
      // },
      // {
      //   name: "pagerduty-watchdog",
      //   webhook_configs: [
      //     {
      //       url: `${alertConfig.watchdogUrl}?m=${getCurrentStack(state).org}-${
      //         getCurrentStack(state).name
      //       }`
      //     }
      //   ]
      // },
      // {
      //   name: "pagerduty",
      //   pagerduty_configs: [
      //     {
      //       description: `{{ .CommonLabels.alertname }} - ${
      //         getCurrentStack(state).org
      //       }-${getCurrentStack(state).name}\n`,
      //       service_key: `${alertConfig.credentials.pagerDutyKey}`
      //     }
      //   ]
      // }
    ]
  };

  collection.add(
    new V1ServicemonitorResource(
      {
        apiVersion: "monitoring.coreos.com/v1",
        kind: "ServiceMonitor",
        metadata: {
          labels: {
            "k8s-app": "alertmanager",
            tenant: "system"
          },
          name: "alertmanager",
          namespace
        },
        spec: {
          endpoints: [
            {
              interval: "30s",
              port: "web",
              path: "/alertmanager/metrics"
            }
          ],
          selector: {
            matchLabels: {
              alertmanager: name
            }
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
        data: {
          "alertmanager.yaml": Buffer.from(
            yaml.safeDump(alertManagerConfig)
          ).toString("base64")
        },
        kind: "Secret",
        metadata: {
          name: `alertmanager-${name}`,
          namespace
        },
        type: "Opaque"
      },
      kubeConfig
    )
  );

  collection.add(
    new V1AlertmanagerResource(
      {
        apiVersion: "monitoring.coreos.com/v1",
        kind: "Alertmanager",
        metadata: {
          labels: {
            alertmanager: name
          },
          name,
          namespace
        },
        spec: {
          baseImage: "quay.io/prometheus/alertmanager",
          externalUrl: `https://system.${domain}/alertmanager/`,
          routePrefix: "/alertmanager",
          logLevel: "info",
          nodeSelector: {
            "kubernetes.io/os": "linux"
          },
          replicas: 3,
          securityContext: {
            fsGroup: 2000,
            runAsNonRoot: true,
            runAsUser: 1000
          },
          serviceAccountName: name,
          version: "v0.18.0"
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
          name,
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
            alertmanager: name
          },
          name: "alertmanager",
          namespace
        },
        spec: {
          ports: [
            {
              name: "web",
              port: 9093,
              targetPort: "web" as any
            }
          ],
          selector: {
            alertmanager: name,
            app: "alertmanager"
          },
          sessionAffinity: "ClientIP"
        }
      },
      kubeConfig
    )
  );

  return collection;
}
