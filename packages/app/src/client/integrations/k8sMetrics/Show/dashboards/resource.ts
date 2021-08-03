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
    __inputs: [],
    __requires: [],
    annotations: {
      list: []
    },
    editable: false,
    gnetId: null,
    graphTooltip: 1,
    hideControls: false,
    id: null,
    links: [],
    refresh: false,
    panels: [
      {
        datasource: null,
        gridPos: {
          h: 1,
          w: 24,
          x: 0,
          y: 0
        },
        id: 31,
        title: "Resources",
        type: "row"
      },
      {
        datasource: "$datasource",
        fieldConfig: {
          defaults: {
            color: {
              mode: "palette-classic"
            },
            custom: {
              axisLabel: "",
              axisPlacement: "auto",
              barAlignment: 0,
              drawStyle: "line",
              fillOpacity: 0,
              gradientMode: "none",
              hideFrom: {
                legend: false,
                tooltip: false,
                viz: false
              },
              lineInterpolation: "linear",
              lineWidth: 1,
              pointSize: 5,
              scaleDistribution: {
                type: "linear"
              },
              showPoints: "auto",
              spanNulls: false,
              stacking: {
                group: "A",
                mode: "none"
              },
              thresholdsStyle: {
                mode: "off"
              }
            },
            mappings: [],
            thresholds: {
              mode: "absolute",
              steps: [
                {
                  color: "green",
                  value: null
                },
                {
                  color: "red",
                  value: 80
                }
              ]
            }
          },
          overrides: []
        },
        gridPos: {
          h: 8,
          w: 12,
          x: 0,
          y: 1
        },
        id: 23,
        options: {
          legend: {
            calcs: [],
            displayMode: "list",
            placement: "bottom"
          },
          tooltip: {
            mode: "single"
          }
        },
        targets: [
          {
            exemplar: true,
            expr: `irate(container_cpu_usage_seconds_total{cpu="total",name="",pod!="",integration_id="${integrationId}"}[5m])`,
            interval: "",
            legendFormat: "{{namespace}}/{{pod}}",
            refId: "A"
          }
        ],
        title: "Container CPU",
        type: "timeseries"
      },
      {
        datasource: "$datasource",
        fieldConfig: {
          defaults: {
            color: {
              mode: "palette-classic"
            },
            custom: {
              axisLabel: "",
              axisPlacement: "auto",
              barAlignment: 0,
              drawStyle: "line",
              fillOpacity: 0,
              gradientMode: "none",
              hideFrom: {
                legend: false,
                tooltip: false,
                viz: false
              },
              lineInterpolation: "linear",
              lineWidth: 1,
              pointSize: 5,
              scaleDistribution: {
                type: "linear"
              },
              showPoints: "auto",
              spanNulls: false,
              stacking: {
                group: "A",
                mode: "none"
              },
              thresholdsStyle: {
                mode: "off"
              }
            },
            mappings: [],
            thresholds: {
              mode: "absolute",
              steps: [
                {
                  color: "green",
                  value: null
                },
                {
                  color: "red",
                  value: 80
                }
              ]
            }
          },
          overrides: []
        },
        gridPos: {
          h: 8,
          w: 12,
          x: 12,
          y: 1
        },
        id: 25,
        options: {
          legend: {
            calcs: [],
            displayMode: "list",
            placement: "bottom"
          },
          tooltip: {
            mode: "single"
          }
        },
        targets: [
          {
            exemplar: true,
            expr: `sum(irate(container_cpu_usage_seconds_total{cpu="total",name="",pod!="",integration_id="${integrationId}"}[5m])) by (instance)`,
            interval: "",
            legendFormat: "{{instance}}",
            refId: "A"
          }
        ],
        title: "Node CPU",
        type: "timeseries"
      },
      {
        datasource: "$datasource",
        description: "",
        fieldConfig: {
          defaults: {
            color: {
              mode: "palette-classic"
            },
            custom: {
              axisLabel: "",
              axisPlacement: "auto",
              barAlignment: 0,
              drawStyle: "line",
              fillOpacity: 0,
              gradientMode: "none",
              hideFrom: {
                legend: false,
                tooltip: false,
                viz: false
              },
              lineInterpolation: "linear",
              lineWidth: 1,
              pointSize: 5,
              scaleDistribution: {
                type: "linear"
              },
              showPoints: "auto",
              spanNulls: false,
              stacking: {
                group: "A",
                mode: "none"
              },
              thresholdsStyle: {
                mode: "off"
              }
            },
            mappings: [],
            thresholds: {
              mode: "absolute",
              steps: [
                {
                  color: "green",
                  value: null
                },
                {
                  color: "red",
                  value: 80
                }
              ]
            },
            unit: "bytes"
          },
          overrides: []
        },
        gridPos: {
          h: 8,
          w: 12,
          x: 0,
          y: 9
        },
        id: 2,
        options: {
          legend: {
            calcs: [],
            displayMode: "list",
            placement: "bottom"
          },
          tooltip: {
            mode: "single"
          }
        },
        targets: [
          {
            exemplar: true,
            expr: `container_memory_rss{container="",pod!="",name="",integration_id="${integrationId}"} < container_memory_working_set_bytes{container="",pod!="",name="",integration_id="${integrationId}"} or container_memory_working_set_bytes{container="",pod!="",name="",integration_id="${integrationId}"}`,
            interval: "",
            legendFormat: "{{namespace}}/{{pod}}",
            refId: "A"
          }
        ],
        title: "Pod memory usage",
        type: "timeseries"
      },
      {
        datasource: "$datasource",
        description: "Doesn't include host processes",
        fieldConfig: {
          defaults: {
            color: {
              mode: "palette-classic"
            },
            custom: {
              axisLabel: "",
              axisPlacement: "auto",
              barAlignment: 0,
              drawStyle: "line",
              fillOpacity: 0,
              gradientMode: "none",
              hideFrom: {
                legend: false,
                tooltip: false,
                viz: false
              },
              lineInterpolation: "linear",
              lineWidth: 1,
              pointSize: 5,
              scaleDistribution: {
                type: "linear"
              },
              showPoints: "auto",
              spanNulls: false,
              stacking: {
                group: "A",
                mode: "none"
              },
              thresholdsStyle: {
                mode: "off"
              }
            },
            mappings: [],
            min: 0,
            thresholds: {
              mode: "absolute",
              steps: [
                {
                  color: "green",
                  value: null
                },
                {
                  color: "red",
                  value: 80
                }
              ]
            },
            unit: "percentunit"
          },
          overrides: []
        },
        gridPos: {
          h: 8,
          w: 12,
          x: 12,
          y: 9
        },
        id: 4,
        options: {
          legend: {
            calcs: [],
            displayMode: "list",
            placement: "bottom"
          },
          tooltip: {
            mode: "single"
          }
        },
        targets: [
          {
            exemplar: true,
            expr: `(container_memory_rss{id="/",integration_id="${integrationId}"} < container_memory_working_set_bytes{id="/",integration_id="${integrationId}"} or container_memory_working_set_bytes{id="/",integration_id="${integrationId}"}) / on(instance) machine_memory_bytes{integration_id="${integrationId}"}`,
            interval: "",
            legendFormat: "{{instance}}",
            refId: "A"
          }
        ],
        title: "Node memory usage by pods",
        type: "timeseries"
      },
      {
        datasource: null,
        gridPos: {
          h: 1,
          w: 24,
          x: 0,
          y: 17
        },
        id: 29,
        title: "I/O",
        type: "row"
      },
      {
        datasource: "$datasource",
        fieldConfig: {
          defaults: {
            color: {
              mode: "palette-classic"
            },
            custom: {
              axisLabel: "",
              axisPlacement: "auto",
              axisSoftMax: -1,
              axisSoftMin: 0,
              barAlignment: 0,
              drawStyle: "line",
              fillOpacity: 0,
              gradientMode: "none",
              hideFrom: {
                legend: false,
                tooltip: false,
                viz: false
              },
              lineInterpolation: "linear",
              lineWidth: 1,
              pointSize: 5,
              scaleDistribution: {
                type: "linear"
              },
              showPoints: "auto",
              spanNulls: false,
              stacking: {
                group: "A",
                mode: "none"
              },
              thresholdsStyle: {
                mode: "off"
              }
            },
            mappings: [],
            thresholds: {
              mode: "absolute",
              steps: [
                {
                  color: "green",
                  value: null
                },
                {
                  color: "red",
                  value: 80
                }
              ]
            },
            unit: "binBps"
          },
          overrides: []
        },
        gridPos: {
          h: 8,
          w: 6,
          x: 0,
          y: 18
        },
        id: 11,
        options: {
          legend: {
            calcs: [],
            displayMode: "list",
            placement: "bottom"
          },
          tooltip: {
            mode: "single"
          }
        },
        targets: [
          {
            exemplar: true,
            expr: `sum(irate(container_fs_reads_bytes_total{container!="",pod!="",integration_id="${integrationId}"}[5m])) by (namespace, pod)`,
            hide: false,
            interval: "",
            legendFormat: "{{namespace}}/{{pod}}",
            refId: "A"
          }
        ],
        title: "Disk Reads (bytes)",
        type: "timeseries"
      },
      {
        datasource: "$datasource",
        description: "",
        fieldConfig: {
          defaults: {
            color: {
              mode: "palette-classic"
            },
            custom: {
              axisLabel: "",
              axisPlacement: "auto",
              axisSoftMax: -1,
              axisSoftMin: 0,
              barAlignment: 0,
              drawStyle: "line",
              fillOpacity: 0,
              gradientMode: "none",
              hideFrom: {
                legend: false,
                tooltip: false,
                viz: false
              },
              lineInterpolation: "linear",
              lineWidth: 1,
              pointSize: 5,
              scaleDistribution: {
                type: "linear"
              },
              showPoints: "auto",
              spanNulls: false,
              stacking: {
                group: "A",
                mode: "none"
              },
              thresholdsStyle: {
                mode: "off"
              }
            },
            mappings: [],
            thresholds: {
              mode: "absolute",
              steps: [
                {
                  color: "green",
                  value: null
                },
                {
                  color: "red",
                  value: 80
                }
              ]
            },
            unit: "short"
          },
          overrides: []
        },
        gridPos: {
          h: 8,
          w: 6,
          x: 6,
          y: 18
        },
        id: 12,
        options: {
          legend: {
            calcs: [],
            displayMode: "list",
            placement: "bottom"
          },
          tooltip: {
            mode: "single"
          }
        },
        targets: [
          {
            exemplar: true,
            expr: `sum(irate(container_fs_reads_total{container!="",pod!="",integration_id="${integrationId}"}[5m])) by (namespace, pod)`,
            hide: false,
            interval: "",
            legendFormat: "{{namespace}}/{{pod}}",
            refId: "A"
          }
        ],
        title: "Disk Reads (iops)",
        type: "timeseries"
      },
      {
        datasource: "$datasource",
        description: "",
        fieldConfig: {
          defaults: {
            color: {
              mode: "palette-classic"
            },
            custom: {
              axisLabel: "",
              axisPlacement: "auto",
              axisSoftMax: -1,
              axisSoftMin: 0,
              barAlignment: 0,
              drawStyle: "line",
              fillOpacity: 0,
              gradientMode: "none",
              hideFrom: {
                legend: false,
                tooltip: false,
                viz: false
              },
              lineInterpolation: "linear",
              lineWidth: 1,
              pointSize: 5,
              scaleDistribution: {
                type: "linear"
              },
              showPoints: "auto",
              spanNulls: false,
              stacking: {
                group: "A",
                mode: "none"
              },
              thresholdsStyle: {
                mode: "off"
              }
            },
            mappings: [],
            thresholds: {
              mode: "absolute",
              steps: [
                {
                  color: "green",
                  value: null
                },
                {
                  color: "red",
                  value: 80
                }
              ]
            },
            unit: "binBps"
          },
          overrides: []
        },
        gridPos: {
          h: 8,
          w: 6,
          x: 12,
          y: 18
        },
        id: 13,
        options: {
          legend: {
            calcs: [],
            displayMode: "list",
            placement: "bottom"
          },
          tooltip: {
            mode: "single"
          }
        },
        targets: [
          {
            exemplar: true,
            expr: `sum(irate(container_fs_writes_bytes_total{container!="",pod!="",integration_id="${integrationId}"}[5m])) by (namespace, pod)`,
            interval: "",
            legendFormat: "{{namespace}}/{{pod}}",
            refId: "A"
          }
        ],
        title: "Disk Writes (bytes)",
        type: "timeseries"
      },
      {
        datasource: "$datasource",
        fieldConfig: {
          defaults: {
            color: {
              mode: "palette-classic"
            },
            custom: {
              axisLabel: "",
              axisPlacement: "auto",
              axisSoftMax: -1,
              axisSoftMin: 0,
              barAlignment: 0,
              drawStyle: "line",
              fillOpacity: 0,
              gradientMode: "none",
              hideFrom: {
                legend: false,
                tooltip: false,
                viz: false
              },
              lineInterpolation: "linear",
              lineWidth: 1,
              pointSize: 5,
              scaleDistribution: {
                type: "linear"
              },
              showPoints: "auto",
              spanNulls: false,
              stacking: {
                group: "A",
                mode: "none"
              },
              thresholdsStyle: {
                mode: "off"
              }
            },
            mappings: [],
            thresholds: {
              mode: "absolute",
              steps: [
                {
                  color: "green",
                  value: null
                },
                {
                  color: "red",
                  value: 80
                }
              ]
            },
            unit: "short"
          },
          overrides: []
        },
        gridPos: {
          h: 8,
          w: 6,
          x: 18,
          y: 18
        },
        id: 14,
        options: {
          legend: {
            calcs: [],
            displayMode: "list",
            placement: "bottom"
          },
          tooltip: {
            mode: "single"
          }
        },
        targets: [
          {
            exemplar: true,
            expr: `sum(irate(container_fs_writes_total{container!="",pod!="",integration_id="${integrationId}"}[5m])) by (namespace, pod)`,
            interval: "",
            legendFormat: "{{namespace}}/{{pod}}",
            refId: "A"
          }
        ],
        title: "Disk Writes (iops)",
        type: "timeseries"
      },
      {
        datasource: "$datasource",
        description: "",
        fieldConfig: {
          defaults: {
            color: {
              mode: "palette-classic"
            },
            custom: {
              axisLabel: "",
              axisPlacement: "auto",
              axisSoftMax: -1,
              axisSoftMin: 0,
              barAlignment: 0,
              drawStyle: "line",
              fillOpacity: 0,
              gradientMode: "none",
              hideFrom: {
                legend: false,
                tooltip: false,
                viz: false
              },
              lineInterpolation: "linear",
              lineWidth: 1,
              pointSize: 5,
              scaleDistribution: {
                type: "linear"
              },
              showPoints: "auto",
              spanNulls: false,
              stacking: {
                group: "A",
                mode: "none"
              },
              thresholdsStyle: {
                mode: "off"
              }
            },
            mappings: [],
            thresholds: {
              mode: "absolute",
              steps: [
                {
                  color: "green",
                  value: null
                },
                {
                  color: "red",
                  value: 80
                }
              ]
            },
            unit: "binBps"
          },
          overrides: []
        },
        gridPos: {
          h: 8,
          w: 6,
          x: 0,
          y: 26
        },
        id: 20,
        options: {
          legend: {
            calcs: [],
            displayMode: "list",
            placement: "bottom"
          },
          tooltip: {
            mode: "single"
          }
        },
        targets: [
          {
            exemplar: true,
            expr: `sum(irate(container_network_receive_bytes_total{pod!="",integration_id="${integrationId}"}[5m])) by (namespace, pod)`,
            interval: "",
            legendFormat: "{{namespace}}/{{pod}}",
            refId: "A"
          }
        ],
        title: "Network RX (bytes)",
        type: "timeseries"
      },
      {
        datasource: "$datasource",
        fieldConfig: {
          defaults: {
            color: {
              mode: "palette-classic"
            },
            custom: {
              axisLabel: "",
              axisPlacement: "auto",
              axisSoftMax: -1,
              axisSoftMin: 0,
              barAlignment: 0,
              drawStyle: "line",
              fillOpacity: 0,
              gradientMode: "none",
              hideFrom: {
                legend: false,
                tooltip: false,
                viz: false
              },
              lineInterpolation: "linear",
              lineWidth: 1,
              pointSize: 5,
              scaleDistribution: {
                type: "linear"
              },
              showPoints: "auto",
              spanNulls: false,
              stacking: {
                group: "A",
                mode: "none"
              },
              thresholdsStyle: {
                mode: "off"
              }
            },
            mappings: [],
            thresholds: {
              mode: "absolute",
              steps: [
                {
                  color: "green",
                  value: null
                },
                {
                  color: "red",
                  value: 80
                }
              ]
            },
            unit: "short"
          },
          overrides: []
        },
        gridPos: {
          h: 8,
          w: 6,
          x: 6,
          y: 26
        },
        id: 21,
        options: {
          legend: {
            calcs: [],
            displayMode: "list",
            placement: "bottom"
          },
          tooltip: {
            mode: "single"
          }
        },
        targets: [
          {
            exemplar: true,
            expr: `sum(irate(container_network_receive_packets_total{pod!="",integration_id="${integrationId}"}[5m])) by (namespace, pod)`,
            interval: "",
            legendFormat: "{{namespace}}/{{pod}}",
            refId: "A"
          }
        ],
        title: "Network RX (packets)",
        type: "timeseries"
      },
      {
        datasource: "$datasource",
        description: "",
        fieldConfig: {
          defaults: {
            color: {
              mode: "palette-classic"
            },
            custom: {
              axisLabel: "",
              axisPlacement: "auto",
              axisSoftMax: -1,
              axisSoftMin: 0,
              barAlignment: 0,
              drawStyle: "line",
              fillOpacity: 0,
              gradientMode: "none",
              hideFrom: {
                legend: false,
                tooltip: false,
                viz: false
              },
              lineInterpolation: "linear",
              lineWidth: 1,
              pointSize: 5,
              scaleDistribution: {
                type: "linear"
              },
              showPoints: "auto",
              spanNulls: false,
              stacking: {
                group: "A",
                mode: "none"
              },
              thresholdsStyle: {
                mode: "off"
              }
            },
            mappings: [],
            thresholds: {
              mode: "absolute",
              steps: [
                {
                  color: "green",
                  value: null
                },
                {
                  color: "red",
                  value: 80
                }
              ]
            },
            unit: "binBps"
          },
          overrides: []
        },
        gridPos: {
          h: 8,
          w: 6,
          x: 12,
          y: 26
        },
        id: 19,
        options: {
          legend: {
            calcs: [],
            displayMode: "list",
            placement: "bottom"
          },
          tooltip: {
            mode: "single"
          }
        },
        targets: [
          {
            exemplar: true,
            expr: `sum(irate(container_network_transmit_bytes_total{pod!="",integration_id="${integrationId}"}[5m])) by (namespace, pod)`,
            interval: "",
            legendFormat: "{{namespace}}/{{pod}}",
            refId: "A"
          }
        ],
        title: "Network TX (bytes)",
        type: "timeseries"
      },
      {
        datasource: "$datasource",
        fieldConfig: {
          defaults: {
            color: {
              mode: "palette-classic"
            },
            custom: {
              axisLabel: "",
              axisPlacement: "auto",
              axisSoftMax: -1,
              axisSoftMin: 0,
              barAlignment: 0,
              drawStyle: "line",
              fillOpacity: 0,
              gradientMode: "none",
              hideFrom: {
                legend: false,
                tooltip: false,
                viz: false
              },
              lineInterpolation: "linear",
              lineWidth: 1,
              pointSize: 5,
              scaleDistribution: {
                type: "linear"
              },
              showPoints: "auto",
              spanNulls: false,
              stacking: {
                group: "A",
                mode: "none"
              },
              thresholdsStyle: {
                mode: "off"
              }
            },
            mappings: [],
            thresholds: {
              mode: "absolute",
              steps: [
                {
                  color: "green",
                  value: null
                },
                {
                  color: "red",
                  value: 80
                }
              ]
            },
            unit: "short"
          },
          overrides: []
        },
        gridPos: {
          h: 8,
          w: 6,
          x: 18,
          y: 26
        },
        id: 18,
        options: {
          legend: {
            calcs: [],
            displayMode: "list",
            placement: "bottom"
          },
          tooltip: {
            mode: "single"
          }
        },
        targets: [
          {
            exemplar: true,
            expr: `sum(irate(container_network_transmit_packets_total{pod!="",integration_id="${integrationId}"}[5m])) by (namespace, pod)`,
            interval: "",
            legendFormat: "{{namespace}}/{{pod}}",
            refId: "A"
          }
        ],
        title: "Network TX (packets)",
        type: "timeseries"
      },
      {
        collapsed: false,
        datasource: null,
        gridPos: {
          h: 1,
          w: 24,
          x: 0,
          y: 34
        },
        id: 27,
        panels: [],
        title: "Limits",
        type: "row"
      },
      {
        datasource: "$datasource",
        fieldConfig: {
          defaults: {
            color: {
              mode: "palette-classic"
            },
            custom: {
              axisLabel: "",
              axisPlacement: "auto",
              axisSoftMin: 0,
              barAlignment: 0,
              drawStyle: "line",
              fillOpacity: 0,
              gradientMode: "none",
              hideFrom: {
                legend: false,
                tooltip: false,
                viz: false
              },
              lineInterpolation: "linear",
              lineWidth: 1,
              pointSize: 5,
              scaleDistribution: {
                type: "linear"
              },
              showPoints: "auto",
              spanNulls: false,
              stacking: {
                group: "A",
                mode: "none"
              },
              thresholdsStyle: {
                mode: "off"
              }
            },
            mappings: [],
            thresholds: {
              mode: "absolute",
              steps: [
                {
                  color: "green",
                  value: null
                },
                {
                  color: "red",
                  value: 80
                }
              ]
            }
          },
          overrides: []
        },
        gridPos: {
          h: 8,
          w: 12,
          x: 0,
          y: 35
        },
        id: 6,
        options: {
          legend: {
            calcs: [],
            displayMode: "list",
            placement: "bottom"
          },
          tooltip: {
            mode: "single"
          }
        },
        targets: [
          {
            exemplar: true,
            expr: `sum(container_file_descriptors{container!="",pod!="",integration_id="${integrationId}"}) by (namespace, pod)`,
            interval: "",
            legendFormat: "{{namespace}}/{{pod}}",
            refId: "A"
          }
        ],
        title: "Open file descriptors",
        type: "timeseries"
      },
      {
        datasource: "$datasource",
        fieldConfig: {
          defaults: {
            color: {
              mode: "palette-classic"
            },
            custom: {
              axisLabel: "",
              axisPlacement: "auto",
              axisSoftMin: 0,
              barAlignment: 0,
              drawStyle: "line",
              fillOpacity: 0,
              gradientMode: "none",
              hideFrom: {
                legend: false,
                tooltip: false,
                viz: false
              },
              lineInterpolation: "linear",
              lineWidth: 1,
              pointSize: 5,
              scaleDistribution: {
                type: "linear"
              },
              showPoints: "auto",
              spanNulls: false,
              stacking: {
                group: "A",
                mode: "none"
              },
              thresholdsStyle: {
                mode: "off"
              }
            },
            mappings: [],
            thresholds: {
              mode: "absolute",
              steps: [
                {
                  color: "green",
                  value: null
                },
                {
                  color: "red",
                  value: 80
                }
              ]
            }
          },
          overrides: []
        },
        gridPos: {
          h: 8,
          w: 12,
          x: 12,
          y: 35
        },
        id: 7,
        options: {
          legend: {
            calcs: [],
            displayMode: "list",
            placement: "bottom"
          },
          tooltip: {
            mode: "single"
          }
        },
        targets: [
          {
            exemplar: true,
            expr: `sum(container_sockets{container!="",pod!="",integration_id="${integrationId}"}) by (namespace, pod)`,
            interval: "",
            legendFormat: "{{namespace}}/{{pod}}",
            refId: "A"
          }
        ],
        title: "Open sockets",
        type: "timeseries"
      },
      {
        datasource: "$datasource",
        fieldConfig: {
          defaults: {
            color: {
              mode: "palette-classic"
            },
            custom: {
              axisLabel: "",
              axisPlacement: "auto",
              axisSoftMin: 0,
              barAlignment: 0,
              drawStyle: "line",
              fillOpacity: 0,
              gradientMode: "none",
              hideFrom: {
                legend: false,
                tooltip: false,
                viz: false
              },
              lineInterpolation: "linear",
              lineWidth: 1,
              pointSize: 5,
              scaleDistribution: {
                type: "linear"
              },
              showPoints: "auto",
              spanNulls: false,
              stacking: {
                group: "A",
                mode: "none"
              },
              thresholdsStyle: {
                mode: "off"
              }
            },
            mappings: [],
            thresholds: {
              mode: "absolute",
              steps: [
                {
                  color: "green",
                  value: null
                },
                {
                  color: "red",
                  value: 80
                }
              ]
            }
          },
          overrides: []
        },
        gridPos: {
          h: 8,
          w: 12,
          x: 0,
          y: 43
        },
        id: 9,
        options: {
          legend: {
            calcs: [],
            displayMode: "list",
            placement: "bottom"
          },
          tooltip: {
            mode: "single"
          }
        },
        targets: [
          {
            exemplar: true,
            expr: `sum(container_processes{container!="",pod!="",integration_id="${integrationId}"}) by (namespace, pod)`,
            interval: "",
            legendFormat: "{{namespace}}/{{pod}}",
            refId: "A"
          }
        ],
        title: "Running processes",
        type: "timeseries"
      },
      {
        datasource: "$datasource",
        fieldConfig: {
          defaults: {
            color: {
              mode: "palette-classic"
            },
            custom: {
              axisLabel: "",
              axisPlacement: "auto",
              axisSoftMin: 0,
              barAlignment: 0,
              drawStyle: "line",
              fillOpacity: 0,
              gradientMode: "none",
              hideFrom: {
                legend: false,
                tooltip: false,
                viz: false
              },
              lineInterpolation: "linear",
              lineWidth: 1,
              pointSize: 5,
              scaleDistribution: {
                type: "linear"
              },
              showPoints: "auto",
              spanNulls: false,
              stacking: {
                group: "A",
                mode: "none"
              },
              thresholdsStyle: {
                mode: "off"
              }
            },
            mappings: [],
            thresholds: {
              mode: "absolute",
              steps: [
                {
                  color: "green",
                  value: null
                },
                {
                  color: "red",
                  value: 80
                }
              ]
            }
          },
          overrides: []
        },
        gridPos: {
          h: 8,
          w: 12,
          x: 12,
          y: 43
        },
        id: 8,
        options: {
          legend: {
            calcs: [],
            displayMode: "list",
            placement: "bottom"
          },
          tooltip: {
            mode: "single"
          }
        },
        targets: [
          {
            exemplar: true,
            expr: `sum(container_threads{container!="",pod!="",integration_id="${integrationId}"}) by (namespace, pod)`,
            interval: "",
            legendFormat: "{{namespace}}/{{pod}}",
            refId: "A"
          }
        ],
        title: "Running threads",
        type: "timeseries"
      }
    ],
    schemaVersion: 30,
    style: "dark",
    tags: ["kubernetes-integration"],
    templating: {
      list: [
        {
          current: {
            text: "Prometheus",
            value: "Prometheus"
          },
          hide: 0,
          label: null,
          name: "datasource",
          options: [],
          query: "prometheus",
          refresh: 1,
          regex: "",
          type: "datasource"
        }
      ]
    },
    time: {
      from: "now-1h",
      to: "now"
    },
    timepicker: {
      refresh_intervals: [
        "5s",
        "10s",
        "30s",
        "1m",
        "5m",
        "15m",
        "30m",
        "1h",
        "2h",
        "1d"
      ],
      time_options: ["5m", "15m", "1h", "6h", "12h", "24h", "2d", "7d", "30d"]
    },
    timezone: "",
    title: "Kubernetes / Resource metrics",
    uid: "Yr7z7VZnk",
    version: 0
  };
}


export type Dashboard = ReturnType<typeof makeDashboard>