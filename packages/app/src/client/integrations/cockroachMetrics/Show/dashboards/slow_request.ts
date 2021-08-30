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
    iteration: 1623960872107,
    links: [],
    panels: [
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
            expr: `sum(requests_slow_raft{integration_id="${integrationId}"})`,
            interval: "",
            legendFormat: "Slow Raft Proposals",
            refId: "A"
          }
        ],
        thresholds: [],
        timeFrom: null,
        timeRegions: [],
        timeShift: null,
        title: "Slow Raft Proposals",
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
            $$hashKey: "object:141",
            format: "short",
            label: "proposals",
            logBase: 1,
            max: null,
            min: "0",
            show: true
          },
          {
            $$hashKey: "object:142",
            format: "short",
            label: "",
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
          y: 7
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
            expr: `sum(requests_slow_distsender{integration_id="${integrationId}"})`,
            interval: "",
            legendFormat: "Slow DistSender RPCs",
            queryType: "randomWalk",
            refId: "A"
          }
        ],
        thresholds: [],
        timeFrom: null,
        timeRegions: [],
        timeShift: null,
        title: "Slow DistSender RPCs",
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
            $$hashKey: "object:88",
            format: "short",
            label: "proposals",
            logBase: 1,
            max: null,
            min: "0",
            show: true
          },
          {
            $$hashKey: "object:89",
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
          y: 14
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
            expr: `sum(requests_slow_lease{integration_id="${integrationId}"})`,
            interval: "",
            legendFormat: "Slow Lease Acquisitions",
            refId: "A"
          }
        ],
        thresholds: [],
        timeFrom: null,
        timeRegions: [],
        timeShift: null,
        title: "Slow Lease Acquisitions",
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
            $$hashKey: "object:245",
            format: "short",
            label: "lease acquisitions",
            logBase: 1,
            max: null,
            min: "0",
            show: true
          },
          {
            $$hashKey: "object:246",
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
          y: 21
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
            expr: `sum(requests_slow_latch{integration_id="${integrationId}"})`,
            interval: "",
            legendFormat: "Slow Latch Acquisitions",
            refId: "A"
          }
        ],
        thresholds: [],
        timeFrom: null,
        timeRegions: [],
        timeShift: null,
        title: "Slow Latch Acquisitions",
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
            $$hashKey: "object:298",
            format: "short",
            label: "latch acquisitions",
            logBase: 1,
            max: null,
            min: "0",
            show: true
          },
          {
            $$hashKey: "object:299",
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
          allValue: ".*",
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
          sort: 3,
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
    timezone: "utc",
    title: "CRDB Console: Slow Requests",
    uid: `slo-${integrationId}`,
    version: 2
  };
}

export type Dashboard = ReturnType<typeof makeDashboard>;
