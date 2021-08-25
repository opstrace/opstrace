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
    iteration: 1623784884657,
    links: [],
    panels: [
      {
        aliasColors: {},
        bars: false,
        dashLength: 10,
        dashes: false,
        datasource: "$DS_PROMETHEUS",
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
            expr: `sum(rate(changefeed_max_behind_nanos{integration_id="${integrationId}",job="cockroachdb",instance=~"$node"}[$__rate_interval]))`,
            interval: "",
            legendFormat: "Max Changefeed Latency",
            refId: "A"
          }
        ],
        thresholds: [],
        timeFrom: null,
        timeRegions: [],
        timeShift: null,
        title: "Max Changefeed Latency",
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
            $$hashKey: "object:162",
            format: "ns",
            label: "time",
            logBase: 1,
            max: null,
            min: "0",
            show: true
          },
          {
            $$hashKey: "object:163",
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
        datasource: null,
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
            expr: `sum(rate(changefeed_emitted_bytes{integration_id="${integrationId}",job="cockroachdb",instance=~"$node"}[$__rate_interval]))`,
            interval: "",
            intervalFactor: 2,
            legendFormat: "Emitted Bytes",
            refId: "A"
          }
        ],
        thresholds: [],
        timeFrom: null,
        timeRegions: [],
        timeShift: null,
        title: "Sink Byte Traffic",
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
            $$hashKey: "object:215",
            format: "short",
            label: "bytes",
            logBase: 1,
            max: "1",
            min: "0",
            show: true
          },
          {
            $$hashKey: "object:216",
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
        datasource: null,
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
            expr: `sum(rate(changefeed_emitted_messages{integration_id="${integrationId}",job="cockroachdb",instance=~"$node"}[$__rate_interval]))`,
            interval: "",
            legendFormat: "Messages",
            refId: "B"
          },
          {
            exemplar: true,
            expr: `sum(rate(changefeed_flushes{integration_id="${integrationId}",job="cockroachdb",instance=~"$node"}[$__rate_interval]))`,
            interval: "",
            legendFormat: "Flushes",
            refId: "A"
          }
        ],
        thresholds: [],
        timeFrom: null,
        timeRegions: [],
        timeShift: null,
        title: "Sink Counts",
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
            $$hashKey: "object:319",
            format: "short",
            label: "actions",
            logBase: 1,
            max: null,
            min: "0",
            show: true
          },
          {
            $$hashKey: "object:320",
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
        datasource: null,
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
            expr: `sum(rate(changefeed_emitted_messages{integration_id="${integrationId}",job="cockroachdb",instance=~"$node"}[$__rate_interval]))`,
            interval: "",
            legendFormat: "Message Emit Time",
            refId: "B"
          },
          {
            exemplar: true,
            expr: `sum(rate(changefeed_flush_nanos{integration_id="${integrationId}",job="cockroachdb",instance=~"$node"}[$__rate_interval]))`,
            interval: "",
            legendFormat: "Flush Time",
            refId: "A"
          }
        ],
        thresholds: [],
        timeFrom: null,
        timeRegions: [],
        timeShift: null,
        title: "Sink Timings",
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
            $$hashKey: "object:372",
            format: "ns",
            label: "time",
            logBase: 1,
            max: null,
            min: "0",
            show: true
          },
          {
            $$hashKey: "object:373",
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
        datasource: null,
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
            expr: `sum(rate(jobs_changefeed_resume_retry_error{integration_id="${integrationId}",job="cockroachdb",instance=~"$node"}[$__rate_interval]))`,
            interval: "",
            legendFormat: "Retryable Errors",
            refId: "A"
          }
        ],
        thresholds: [],
        timeFrom: null,
        timeRegions: [],
        timeShift: null,
        title: "Changefeed Restarts",
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
            $$hashKey: "object:476",
            format: "short",
            label: "actions",
            logBase: 1,
            max: null,
            min: "0",
            show: true
          },
          {
            $$hashKey: "object:477",
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
          current: {
            selected: false,
            text: "Prometheus",
            value: "Prometheus"
          },
          description: null,
          error: null,
          hide: 0,
          includeAll: false,
          label: "datasource",
          multi: false,
          name: "DS_PROMETHEUS",
          options: [],
          query: "prometheus",
          refresh: 1,
          regex: "",
          skipUrlSync: false,
          type: "datasource"
        },
        {
          allValue: "",
          current: {
            selected: false,
            text: "All",
            value: "$__all"
          },
          datasource: "$DS_PROMETHEUS",
          definition: `label_values(sys_uptime{integration_id="${integrationId}",job="cockroachdb"},instance)`,
          description: null,
          error: null,
          hide: 0,
          includeAll: true,
          label: "Node",
          multi: false,
          name: "node",
          options: [],
          query: {
            query: `label_values(sys_uptime{integration_id="${integrationId}",job="cockroachdb"},instance)`,
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
        },
        {
          auto: false,
          auto_count: 30,
          auto_min: "10s",
          current: {
            selected: false,
            text: "30s",
            value: "30s"
          },
          description: null,
          error: null,
          hide: 0,
          label: "Rate Interval",
          name: "rate_interval",
          options: [
            {
              selected: true,
              text: "30s",
              value: "30s"
            },
            {
              selected: false,
              text: "1m",
              value: "1m"
            },
            {
              selected: false,
              text: "5m",
              value: "5m"
            },
            {
              selected: false,
              text: "10m",
              value: "10m"
            },
            {
              selected: false,
              text: "30m",
              value: "30m"
            },
            {
              selected: false,
              text: "1h",
              value: "1h"
            },
            {
              selected: false,
              text: "6h",
              value: "6h"
            },
            {
              selected: false,
              text: "12h",
              value: "12h"
            },
            {
              selected: false,
              text: "1d",
              value: "1d"
            }
          ],
          query: "30s,1m,5m,10m,30m,1h,6h,12h,1d",
          refresh: 2,
          skipUrlSync: false,
          type: "interval"
        }
      ]
    },
    time: {
      from: "now-1h",
      to: "now"
    },
    timepicker: {},
    timezone: "browser",
    title: "CRDB Console: Changefeeds",
    uid: "crdb-console-changefeeds",
    version: 3
  };
}

export type Dashboard = ReturnType<typeof makeDashboard>;
