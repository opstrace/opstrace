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
    iteration: 1623957533555,
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
        linewidth: 2,
        nullPointMode: "null as zero",
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
            expr: `sys_cpu_combined_percent_normalized{job='cockroachdb',instance=~"$node"}`,
            interval: "",
            intervalFactor: 1,
            legendFormat: "{{instance}}",
            refId: "A"
          }
        ],
        thresholds: [],
        timeFrom: null,
        timeRegions: [],
        timeShift: null,
        title: "CPU Percent",
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
            $$hashKey: "object:233",
            format: "percentunit",
            label: "CPU (percentage)",
            logBase: 1,
            max: null,
            min: "0",
            show: true
          },
          {
            $$hashKey: "object:234",
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
        description: "Memory in use across all nodes",
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
            expr: `sys_rss{integration_id="${integrationId}",instance=~"$node"}`,
            hide: false,
            interval: "",
            legendFormat: "{{instance}}",
            refId: "A"
          }
        ],
        thresholds: [],
        timeFrom: null,
        timeRegions: [],
        timeShift: null,
        title: "Memory Usage",
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
            $$hashKey: "object:78",
            format: "bytes",
            label: "memory usage",
            logBase: 1,
            max: null,
            min: "0",
            show: true
          },
          {
            $$hashKey: "object:79",
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
            expr: `rate(sys_host_disk_read_bytes{integration_id="${integrationId}",instance=~"$node"}[5m])`,
            interval: "",
            legendFormat: "{{instance}}",
            refId: "A"
          }
        ],
        thresholds: [],
        timeFrom: null,
        timeRegions: [],
        timeShift: null,
        title: "Disk Read B/s",
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
            $$hashKey: "object:183",
            format: "bytes",
            label: "bytes",
            logBase: 1,
            max: null,
            min: null,
            show: true
          },
          {
            $$hashKey: "object:184",
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
          y: 24
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
            expr: `rate(sys_host_disk_write_bytes{integration_id="${integrationId}",instance=~"$node"}[5m])`,
            interval: "",
            legendFormat: "{{instance}}",
            refId: "A"
          }
        ],
        thresholds: [],
        timeFrom: null,
        timeRegions: [],
        timeShift: null,
        title: "Disk Write B/s",
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
            $$hashKey: "object:655",
            format: "bytes",
            label: "bytes",
            logBase: 1,
            max: null,
            min: "0",
            show: true
          },
          {
            $$hashKey: "object:656",
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
          y: 32
        },
        hiddenSeries: false,
        id: 10,
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
            expr: `rate(sys_host_disk_read_count{integration_id="${integrationId}",instance=~"$node"}[5m])`,
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
        title: "Disk Read IOPS",
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
            $$hashKey: "object:761",
            format: "short",
            label: "IOPS",
            logBase: 1,
            max: null,
            min: "0",
            show: true
          },
          {
            $$hashKey: "object:762",
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
          y: 40
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
            expr: `rate(sys_host_disk_write_count{integration_id="${integrationId}",instance=~"$node"}[5m])`,
            interval: "",
            legendFormat: "{{instance}}",
            refId: "A"
          }
        ],
        thresholds: [],
        timeFrom: null,
        timeRegions: [],
        timeShift: null,
        title: "Disk Write IOPS",
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
            $$hashKey: "object:850",
            format: "short",
            label: "IOPS",
            logBase: 1,
            max: null,
            min: "0",
            show: true
          },
          {
            $$hashKey: "object:851",
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
          y: 48
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
            expr: `rate(sys_host_disk_iopsinprogress{integration_id="${integrationId}",instance=~"$node"}[5m])`,
            interval: "",
            legendFormat: "{{instance}}",
            refId: "A"
          }
        ],
        thresholds: [],
        timeFrom: null,
        timeRegions: [],
        timeShift: null,
        title: "Disk Ops In Progress",
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
            $$hashKey: "object:926",
            format: "short",
            label: "Ops",
            logBase: 1,
            max: null,
            min: null,
            show: true
          },
          {
            $$hashKey: "object:927",
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
          "Free disk space available to CockroachDB data.\n\n[How is this metric calculated?](https://www.cockroachlabs.com/docs/v21.1/ui-storage-dashboard.html#capacity-metrics)",
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
          y: 56
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
            expr: `capacity_available{integration_id="${integrationId}",instance=~"$node"}`,
            interval: "",
            intervalFactor: 1,
            legendFormat: "{{instance}}",
            refId: "A"
          }
        ],
        thresholds: [],
        timeFrom: null,
        timeRegions: [],
        timeShift: null,
        title: "Available Disk Capacity",
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
            $$hashKey: "object:103",
            format: "bytes",
            label: "capacity",
            logBase: 1,
            max: null,
            min: "0",
            show: true
          },
          {
            $$hashKey: "object:104",
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
          y: 64
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
            expr: `rate(sys_host_net_recv_bytes{integration_id="${integrationId}",instance=~"$node"}[5m])`,
            interval: "",
            legendFormat: "{{instance}}",
            refId: "A"
          }
        ],
        thresholds: [],
        timeFrom: null,
        timeRegions: [],
        timeShift: null,
        title: "Network Bytes Received",
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
            $$hashKey: "object:1076",
            format: "bytes",
            label: "bytes",
            logBase: 1,
            max: null,
            min: "0",
            show: true
          },
          {
            $$hashKey: "object:1077",
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
          y: 72
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
            expr: `rate(sys_host_net_send_bytes{integration_id="${integrationId}",instance=~"$node"}[5m])`,
            interval: "",
            legendFormat: "{{instance}}",
            refId: "A"
          }
        ],
        thresholds: [],
        timeFrom: null,
        timeRegions: [],
        timeShift: null,
        title: "Network Bytes Sent",
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
            $$hashKey: "object:708",
            format: "bytes",
            label: "bytes",
            logBase: 1,
            max: null,
            min: null,
            show: true
          },
          {
            $$hashKey: "object:709",
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
    refresh: false,
    schemaVersion: 27,
    style: "dark",
    tags: [],
    templating: {
      list: [
        {
          allValue: "",
          current: {
            selected: true,
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
            refId: "Prometheusa-node-Variable-Query"
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
    title: "CRDB Console: Hardware",
    uid: "crdb-console-hardware",
    version: 4
  };
}

export type Dashboard = ReturnType<typeof makeDashboard>;
