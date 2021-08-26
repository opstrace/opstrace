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

export default function makeDashboard(integrationId: string) {
  return {
    annotations: {
      list: [
        {
          builtIn: 1,
          datasource: "-- Grafana --",
          enable: true,
          hide: true,
          iconColor: "rgba(0, 211, 255, 1)",
          name: "Annotations & Alerts",
          type: "dashboard"
        }
      ]
    },
    editable: true,
    gnetId: null,
    graphTooltip: 0,
    iteration: 1624297806854,
    links: [],
    panels: [
      {
        aliasColors: {},
        bars: false,
        dashLength: 10,
        dashes: false,
        datasource: "metrics",
        description: "",
        fieldConfig: {
          defaults: {},
          overrides: []
        },
        fill: 1,
        fillGradient: 0,
        gridPos: {
          h: 8,
          w: 24,
          x: 0,
          y: 0
        },
        hiddenSeries: false,
        id: 2,
        legend: {
          avg: false,
          current: false,
          max: false,
          min: false,
          show: true,
          total: false,
          values: false
        },
        lines: true,
        linewidth: 1,
        nullPointMode: "null",
        options: {
          alertThreshold: true
        },
        percentage: false,
        pluginVersion: "",
        pointradius: 2,
        points: false,
        renderer: "flot",
        seriesOverrides: [],
        spaceLength: 10,
        stack: false,
        steppedLine: false,
        targets: [
          {
            exemplar: true,
            expr: `sum(rate(distsender_batches{integration_id="${integrationId}",instance=~"$node"}[5m]))`,
            interval: "",
            legendFormat: "Batch",
            refId: "A"
          },
          {
            exemplar: true,
            expr: `sum(rate(distsender_batches_partial{integration_id="${integrationId}",instance=~"$node"}[5m]))`,
            interval: "",
            legendFormat: "Partial Batches",
            refId: "B"
          }
        ],
        thresholds: [],
        timeFrom: null,
        timeRegions: [],
        timeShift: null,
        title: "Batches",
        tooltip: {
          shared: true,
          sort: 0,
          value_type: "individual"
        },
        type: "graph",
        xaxis: {
          buckets: null,
          mode: "time",
          name: null,
          show: true,
          values: []
        },
        yaxes: [
          {
            $$hashKey: "object:159",
            format: "short",
            label: "batches",
            logBase: 1,
            max: null,
            min: "0",
            show: true
          },
          {
            $$hashKey: "object:160",
            format: "short",
            label: null,
            logBase: 1,
            max: null,
            min: null,
            show: true
          }
        ],
        yaxis: {
          align: false,
          alignLevel: null
        }
      },
      {
        aliasColors: {},
        bars: false,
        dashLength: 10,
        dashes: false,
        datasource: "metrics",
        fieldConfig: {
          defaults: {},
          overrides: []
        },
        fill: 1,
        fillGradient: 0,
        gridPos: {
          h: 8,
          w: 24,
          x: 0,
          y: 8
        },
        hiddenSeries: false,
        id: 4,
        legend: {
          avg: false,
          current: false,
          max: false,
          min: false,
          show: true,
          total: false,
          values: false
        },
        lines: true,
        linewidth: 1,
        nullPointMode: "null",
        options: {
          alertThreshold: true
        },
        percentage: false,
        pluginVersion: "",
        pointradius: 2,
        points: false,
        renderer: "flot",
        seriesOverrides: [],
        spaceLength: 10,
        stack: false,
        steppedLine: false,
        targets: [
          {
            exemplar: true,
            expr: `sum(rate(distsender_rpc_sent{integration_id="${integrationId}"}[5m]))`,
            interval: "",
            intervalFactor: 2,
            legendFormat: "RPCs Sent",
            refId: "A"
          },
          {
            exemplar: true,
            expr: `sum(rate(distsender_rpc_sent_local{integration_id="${integrationId}"}[5m]))`,
            interval: "",
            legendFormat: "Local Fast-path",
            refId: "B"
          }
        ],
        thresholds: [],
        timeFrom: null,
        timeRegions: [],
        timeShift: null,
        title: "RPCs",
        tooltip: {
          shared: true,
          sort: 0,
          value_type: "individual"
        },
        type: "graph",
        xaxis: {
          buckets: null,
          mode: "time",
          name: null,
          show: true,
          values: []
        },
        yaxes: [
          {
            $$hashKey: "object:309",
            format: "short",
            label: "rpcs",
            logBase: 1,
            max: null,
            min: null,
            show: true
          },
          {
            $$hashKey: "object:310",
            format: "short",
            label: null,
            logBase: 1,
            max: null,
            min: null,
            show: true
          }
        ],
        yaxis: {
          align: false,
          alignLevel: null
        }
      },
      {
        aliasColors: {},
        bars: false,
        dashLength: 10,
        dashes: false,
        datasource: "metrics",
        fieldConfig: {
          defaults: {},
          overrides: []
        },
        fill: 1,
        fillGradient: 0,
        gridPos: {
          h: 7,
          w: 24,
          x: 0,
          y: 16
        },
        hiddenSeries: false,
        id: 6,
        legend: {
          avg: false,
          current: false,
          max: false,
          min: false,
          show: true,
          total: false,
          values: false
        },
        lines: true,
        linewidth: 2,
        nullPointMode: "null",
        options: {
          alertThreshold: true
        },
        percentage: false,
        pluginVersion: "",
        pointradius: 2,
        points: false,
        renderer: "flot",
        seriesOverrides: [],
        spaceLength: 10,
        stack: false,
        steppedLine: false,
        targets: [
          {
            exemplar: true,
            expr: `sum(rate(distsender_rpc_sent_nextreplicaerror{integration_id="${integrationId}",instance=~"$node"}[5m]))`,
            hide: false,
            interval: "",
            intervalFactor: 1,
            legendFormat: "Replica Errors",
            refId: "A"
          },
          {
            exemplar: true,
            expr: `sum(rate(distsender_errors_notleaseholder{integration_id="${integrationId}",instance=~"$node"}[5m]))`,
            interval: "",
            intervalFactor: 1,
            legendFormat: "Not Lease Holder Errors",
            refId: "B"
          }
        ],
        thresholds: [],
        timeFrom: null,
        timeRegions: [],
        timeShift: null,
        title: "RPC Errors",
        tooltip: {
          shared: true,
          sort: 0,
          value_type: "individual"
        },
        type: "graph",
        xaxis: {
          buckets: null,
          mode: "time",
          name: null,
          show: true,
          values: []
        },
        yaxes: [
          {
            $$hashKey: "object:83",
            format: "short",
            label: "errors",
            logBase: 1,
            max: null,
            min: "0",
            show: true
          },
          {
            $$hashKey: "object:84",
            format: "short",
            label: null,
            logBase: 1,
            max: null,
            min: null,
            show: true
          }
        ],
        yaxis: {
          align: false,
          alignLevel: null
        }
      },
      {
        aliasColors: {},
        bars: false,
        dashLength: 10,
        dashes: false,
        datasource: "metrics",
        fieldConfig: {
          defaults: {},
          overrides: []
        },
        fill: 1,
        fillGradient: 0,
        gridPos: {
          h: 7,
          w: 24,
          x: 0,
          y: 23
        },
        hiddenSeries: false,
        id: 8,
        legend: {
          avg: false,
          current: false,
          max: false,
          min: false,
          show: true,
          total: false,
          values: false
        },
        lines: true,
        linewidth: 1,
        nullPointMode: "null",
        options: {
          alertThreshold: true
        },
        percentage: false,
        pluginVersion: "",
        pointradius: 2,
        points: false,
        renderer: "flot",
        seriesOverrides: [],
        spaceLength: 10,
        stack: false,
        steppedLine: false,
        targets: [
          {
            exemplar: true,
            expr: `sum(rate(txn_commits{integration_id="${integrationId}",instance=~"$node"}[5m]))`,
            interval: "",
            intervalFactor: 1,
            legendFormat: "Commited",
            refId: "A"
          },
          {
            exemplar: true,
            expr: `sum(rate(txn_commits1PC{integration_id="${integrationId}",instance=~"$node"}[5m]))`,
            hide: false,
            interval: "",
            intervalFactor: 1,
            legendFormat: "Fast-path Commited",
            refId: "C"
          },
          {
            exemplar: true,
            expr: `sum(rate(txn_aborts{integration_id="${integrationId}",instance=~"$node"}[5m]))`,
            interval: "",
            legendFormat: "Aborted",
            refId: "B"
          }
        ],
        thresholds: [],
        timeFrom: null,
        timeRegions: [],
        timeShift: null,
        title: "KV Transactions",
        tooltip: {
          shared: true,
          sort: 0,
          value_type: "individual"
        },
        type: "graph",
        xaxis: {
          buckets: null,
          mode: "time",
          name: null,
          show: true,
          values: []
        },
        yaxes: [
          {
            $$hashKey: "object:668",
            format: "short",
            label: "transactions",
            logBase: 1,
            max: null,
            min: "0",
            show: true
          },
          {
            $$hashKey: "object:669",
            format: "short",
            label: null,
            logBase: 1,
            max: null,
            min: null,
            show: true
          }
        ],
        yaxis: {
          align: false,
          alignLevel: null
        }
      },
      {
        aliasColors: {},
        bars: false,
        dashLength: 10,
        dashes: false,
        datasource: "metrics",
        fieldConfig: {
          defaults: {},
          overrides: []
        },
        fill: 1,
        fillGradient: 0,
        gridPos: {
          h: 8,
          w: 24,
          x: 0,
          y: 30
        },
        hiddenSeries: false,
        id: 20,
        legend: {
          avg: false,
          current: false,
          max: false,
          min: false,
          show: true,
          total: false,
          values: false
        },
        lines: true,
        linewidth: 1,
        nullPointMode: "null",
        options: {
          alertThreshold: true
        },
        percentage: false,
        pluginVersion: "",
        pointradius: 2,
        points: false,
        renderer: "flot",
        seriesOverrides: [],
        spaceLength: 10,
        stack: false,
        steppedLine: false,
        targets: [
          {
            exemplar: true,
            expr: `sum(rate(txn_restarts_writetooold{integration_id="${integrationId}",instance=~"$node"}[5m]))`,
            interval: "",
            legendFormat: "Write Too Old",
            refId: "A"
          },
          {
            exemplar: true,
            expr: `sum(rate(txn_restarts_writetoooldmulti{integration_id="${integrationId}",instance=~"$node"}[5m]))`,
            hide: false,
            interval: "",
            legendFormat: "Write Too Old (multiple)",
            refId: "B"
          },
          {
            exemplar: true,
            expr: `sum(rate(txn_restarts_serializable{integration_id="${integrationId}",instance=~"$node"}[5m]))`,
            hide: false,
            interval: "",
            legendFormat: "Forwarded Timestamp (iso=serializable)",
            refId: "C"
          },
          {
            exemplar: true,
            expr: `sum(rate(txn_restarts_asyncwritefailure{integration_id="${integrationId}",instance=~"$node"}[5m]))`,
            hide: false,
            interval: "",
            legendFormat: "Async Consensus Failure",
            refId: "D"
          },
          {
            exemplar: true,
            expr: `sum(rate(txn_restarts_readwithinuncertainty{integration_id="${integrationId}",instance=~"$node"}[5m]))`,
            hide: false,
            interval: "",
            legendFormat: "Read Within Uncertainty Interval",
            refId: "E"
          },
          {
            exemplar: true,
            expr: `sum(rate(txn_restarts_txnaborted{integration_id="${integrationId}",instance=~"$node"}[5m]))`,
            hide: false,
            interval: "",
            legendFormat: "Aborted",
            refId: "F"
          },
          {
            exemplar: true,
            expr: `sum(rate(txn_restarts_txnpush{integration_id="${integrationId}",instance=~"$node"}[5m]))`,
            hide: false,
            interval: "",
            legendFormat: "Push Failure",
            refId: "G"
          },
          {
            exemplar: true,
            expr: `sum(rate(txn_restarts_unknown{integration_id="${integrationId}",instance=~"$node"}[5m]))`,
            hide: false,
            interval: "",
            legendFormat: "Unknown",
            refId: "H"
          }
        ],
        thresholds: [],
        timeFrom: null,
        timeRegions: [],
        timeShift: null,
        title: "KV Transaction Restarts",
        tooltip: {
          shared: true,
          sort: 0,
          value_type: "individual"
        },
        type: "graph",
        xaxis: {
          buckets: null,
          mode: "time",
          name: null,
          show: true,
          values: []
        },
        yaxes: [
          {
            $$hashKey: "object:437",
            format: "short",
            label: "restarts",
            logBase: 1,
            max: null,
            min: "0",
            show: true
          },
          {
            $$hashKey: "object:438",
            format: "short",
            label: null,
            logBase: 1,
            max: null,
            min: null,
            show: true
          }
        ],
        yaxis: {
          align: false,
          alignLevel: null
        }
      },
      {
        aliasColors: {},
        bars: false,
        dashLength: 10,
        dashes: false,
        datasource: "metrics",
        description:
          "The 99th percentile of transaction durations over a 1 minute period.",
        fieldConfig: {
          defaults: {},
          overrides: []
        },
        fill: 1,
        fillGradient: 0,
        gridPos: {
          h: 7,
          w: 24,
          x: 0,
          y: 38
        },
        hiddenSeries: false,
        id: 12,
        legend: {
          avg: false,
          current: false,
          max: false,
          min: false,
          show: true,
          total: false,
          values: false
        },
        lines: true,
        linewidth: 1,
        nullPointMode: "null",
        options: {
          alertThreshold: true
        },
        percentage: false,
        pluginVersion: "",
        pointradius: 2,
        points: false,
        renderer: "flot",
        seriesOverrides: [],
        spaceLength: 10,
        stack: false,
        steppedLine: false,
        targets: [
          {
            exemplar: true,
            expr: `histogram_quantile(0.99,rate(txn_durations_bucket{integration_id="${integrationId}",instance=~"$node"}[1m]))`,
            interval: "",
            legendFormat: "{{instance}}",
            refId: "B"
          }
        ],
        thresholds: [],
        timeFrom: null,
        timeRegions: [],
        timeShift: null,
        title: "KV Transactional Durations: 99th percentile",
        tooltip: {
          shared: true,
          sort: 0,
          value_type: "individual"
        },
        type: "graph",
        xaxis: {
          buckets: null,
          mode: "time",
          name: null,
          show: true,
          values: []
        },
        yaxes: [
          {
            $$hashKey: "object:316",
            format: "ns",
            label: "transaction duration",
            logBase: 1,
            max: null,
            min: "0",
            show: true
          },
          {
            $$hashKey: "object:317",
            format: "short",
            label: null,
            logBase: 1,
            max: null,
            min: null,
            show: true
          }
        ],
        yaxis: {
          align: false,
          alignLevel: null
        }
      },
      {
        aliasColors: {},
        bars: false,
        dashLength: 10,
        dashes: false,
        datasource: "metrics",
        description:
          "The 90th percentile of transaction durations over a 1 minute period.",
        fieldConfig: {
          defaults: {},
          overrides: []
        },
        fill: 1,
        fillGradient: 0,
        gridPos: {
          h: 7,
          w: 24,
          x: 0,
          y: 45
        },
        hiddenSeries: false,
        id: 18,
        legend: {
          avg: false,
          current: false,
          max: false,
          min: false,
          show: true,
          total: false,
          values: false
        },
        lines: true,
        linewidth: 1,
        nullPointMode: "null",
        options: {
          alertThreshold: true
        },
        percentage: false,
        pluginVersion: "",
        pointradius: 2,
        points: false,
        renderer: "flot",
        seriesOverrides: [],
        spaceLength: 10,
        stack: false,
        steppedLine: false,
        targets: [
          {
            exemplar: true,
            expr: `histogram_quantile(0.90,rate(txn_durations_bucket{integration_id="${integrationId}",instance=~"$node"}[1m]))`,
            interval: "",
            legendFormat: "{{instance}}",
            refId: "A"
          }
        ],
        thresholds: [],
        timeFrom: null,
        timeRegions: [],
        timeShift: null,
        title: "KV Transaction Durations: 90th percentile",
        tooltip: {
          shared: true,
          sort: 0,
          value_type: "individual"
        },
        type: "graph",
        xaxis: {
          buckets: null,
          mode: "time",
          name: null,
          show: true,
          values: []
        },
        yaxes: [
          {
            $$hashKey: "object:263",
            format: "ns",
            label: "transaction duration",
            logBase: 1,
            max: null,
            min: "0",
            show: true
          },
          {
            $$hashKey: "object:264",
            format: "short",
            label: null,
            logBase: 1,
            max: null,
            min: null,
            show: true
          }
        ],
        yaxis: {
          align: false,
          alignLevel: null
        }
      },
      {
        aliasColors: {},
        bars: false,
        dashLength: 10,
        dashes: false,
        datasource: "metrics",
        description:
          "The 99th percentile of latency to heartbeat a node's internal liveness record over a 1 minute period.",
        fieldConfig: {
          defaults: {},
          overrides: []
        },
        fill: 1,
        fillGradient: 0,
        gridPos: {
          h: 7,
          w: 24,
          x: 0,
          y: 52
        },
        hiddenSeries: false,
        id: 14,
        legend: {
          avg: false,
          current: false,
          max: false,
          min: false,
          show: true,
          total: false,
          values: false
        },
        lines: true,
        linewidth: 2,
        nullPointMode: "null",
        options: {
          alertThreshold: true
        },
        percentage: false,
        pluginVersion: "",
        pointradius: 2,
        points: false,
        renderer: "flot",
        seriesOverrides: [],
        spaceLength: 10,
        stack: false,
        steppedLine: false,
        targets: [
          {
            exemplar: true,
            expr: `histogram_quantile(0.99,rate(liveness_heartbeatlatency_bucket{integration_id="${integrationId}",instance=~"$node"}[1m]))`,
            interval: "",
            intervalFactor: 2,
            legendFormat: "{{instance}}",
            refId: "A"
          }
        ],
        thresholds: [],
        timeFrom: null,
        timeRegions: [],
        timeShift: null,
        title: "Node Heartbeat Latency: 99th percentile ",
        tooltip: {
          shared: true,
          sort: 0,
          value_type: "individual"
        },
        type: "graph",
        xaxis: {
          buckets: null,
          mode: "time",
          name: null,
          show: true,
          values: []
        },
        yaxes: [
          {
            $$hashKey: "object:210",
            format: "ns",
            label: "heartbeat latency",
            logBase: 1,
            max: null,
            min: "0",
            show: true
          },
          {
            $$hashKey: "object:211",
            format: "short",
            label: null,
            logBase: 1,
            max: null,
            min: null,
            show: true
          }
        ],
        yaxis: {
          align: false,
          alignLevel: null
        }
      },
      {
        aliasColors: {},
        bars: false,
        dashLength: 10,
        dashes: false,
        datasource: "metrics",
        description:
          "The 90th percentile of latency to heartbeat a node's internal liveness record over a 1 minute period.",
        fieldConfig: {
          defaults: {},
          overrides: []
        },
        fill: 1,
        fillGradient: 0,
        gridPos: {
          h: 7,
          w: 24,
          x: 0,
          y: 59
        },
        hiddenSeries: false,
        id: 16,
        legend: {
          avg: false,
          current: false,
          max: false,
          min: false,
          show: true,
          total: false,
          values: false
        },
        lines: true,
        linewidth: 1,
        nullPointMode: "null",
        options: {
          alertThreshold: true
        },
        percentage: false,
        pluginVersion: "",
        pointradius: 2,
        points: false,
        renderer: "flot",
        seriesOverrides: [],
        spaceLength: 10,
        stack: false,
        steppedLine: false,
        targets: [
          {
            exemplar: true,
            expr: `histogram_quantile(0.90,rate(liveness_heartbeatlatency_bucket{integration_id="${integrationId}",instance=~"$node"}[1m]))`,
            interval: "",
            intervalFactor: 2,
            legendFormat: "{{instance}}",
            refId: "A"
          }
        ],
        thresholds: [],
        timeFrom: null,
        timeRegions: [],
        timeShift: null,
        title: "Node Heartbeat Latency: 90th percentile",
        tooltip: {
          shared: true,
          sort: 0,
          value_type: "individual"
        },
        type: "graph",
        xaxis: {
          buckets: null,
          mode: "time",
          name: null,
          show: true,
          values: []
        },
        yaxes: [
          {
            $$hashKey: "object:157",
            format: "ns",
            label: "heartbeat latency",
            logBase: 1,
            max: null,
            min: "0",
            show: true
          },
          {
            $$hashKey: "object:158",
            format: "short",
            label: null,
            logBase: 1,
            max: null,
            min: null,
            show: true
          }
        ],
        yaxis: {
          align: false,
          alignLevel: null
        }
      }
    ],
    schemaVersion: 27,
    style: "dark",
    tags: [],
    templating: {
      list: [
        {
          allValue: "",
          current: {
            selected: false,
            text: "All",
            value: "$__all"
          },
          datasource: "metrics",
          definition: `label_values(sys_uptime{integration_id="${integrationId}"},instance)`,
          description: null,
          error: null,
          hide: 0,
          includeAll: true,
          label: "Node",
          multi: false,
          name: "node",
          options: [],
          query: {
            query: `label_values(sys_uptime{integration_id="${integrationId}"},instance)`,
            refId: "Prometheus-node-Variable-Query"
          },
          refresh: 1,
          regex: "",
          skipUrlSync: false,
          sort: 1,
          tagValuesQuery: "",
          tags: [],
          tagsQuery: "",
          type: "query",
          useTags: false
        }
      ]
    },
    time: {
      from: "now-1h",
      to: "now"
    },
    timepicker: {},
    timezone: "browser",
    title: "CRDB Console: Distributed",
    uid: "crdb-console-distributed",
    version: 3
  };
}

export type Dashboard = ReturnType<typeof makeDashboard>;
