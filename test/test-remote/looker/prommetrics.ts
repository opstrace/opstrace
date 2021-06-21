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

// This module defines Prometheus metrics exposed by looker's HTTP server
// at the /metrics endpoint.

import * as promclient from "prom-client";

export const counter_fragments_pushed = new promclient.Counter({
  name: "counter_fragments_pushed",
  help: "number of log stream fragments successfully pushed"
});

export const counter_serialized_fragments_bytes_pushed = new promclient.Counter(
  {
    name: "counter_serialized_fragments_bytes_pushed",
    help:
      "cumulative size of snappy-compressed protobuf messages (serialized log stream fragments) successfully POSTed to Loki API"
    // note that this should be the ~amount of data written into HTTP request
    // bodies over the wire -- however, it's unclear if maybe some additional
    // gzip compression happens on top of this
  }
);

export const counter_log_entries_pushed = new promclient.Counter({
  name: "counter_log_entries_pushed",
  help: "number of log entries successfully pushed"
});

export const counter_payload_bytes_pushed = new promclient.Counter({
  name: "counter_payload_bytes_pushed",
  help:
    "byte length of all pushed log entries / metric samples so far " +
    "(12 byte per timestamp, assume utf-8 encoding for logs and 8 bytes per sample for metrics)"
});

export const counter_post_responses = new promclient.Counter({
  name: "counter_post_responses",
  help: "HTTP responses to POST requests by status code",
  labelNames: ["statuscode"]
});

export const counter_post_non_http_errors = new promclient.Counter({
  name: "counter_post_non_http_errors",
  help: "connection errors and the likes, must refer to logs for detail"
});

export const counter_get_responses = new promclient.Counter({
  name: "counter_get_responses",
  help: "HTTP responses to GET requests by status code",
  labelNames: ["statuscode"]
});

export const counter_unexpected_query_results = new promclient.Counter({
  name: "counter_unexpected_query_results",
  help:
    "Error counter for unexpected Loki query results " +
    "(such as unexpected log entry count in query result)",
  labelNames: ["statuscode"]
});

export const counter_get_non_http_errors = new promclient.Counter({
  name: "counter_get_non_http_errors",
  help: "connection errors and the likes, must refer to logs for detail"
});

export const counter_rw_cycles = new promclient.Counter({
  name: "counter_rw_cycles",
  help: "number of read/write cycles performed"
});

export const counter_fragment_generation_delayed = new promclient.Counter({
  name: "counter_fragment_generation_delayed",
  help:
    "number of times fragment generation was delayed (in metrics mode) " +
    "because otherwise we would overtake walltime"
});

export const counter_forward_leap = new promclient.Counter({
  name: "counter_forward_leap",
  help:
    "number of times a time series was forward-leaped (by N minutes) " +
    "to not fall behind walltime too much"
});

export const gauge_last_http_request_body_size_bytes = new promclient.Gauge({
  name: "gauge_last_http_request_body_size_bytes",
  help:
    "size of last successfully POSTed HTTP request body (snappy-compressed protobuf message: a serialized log stream fragments)"
});

export const hist_duration_post_with_retry_seconds = new promclient.Histogram({
  name: "duration_post_with_retry_seconds",
  help: "Duration between entering postWithRetry and leaving it with success",
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 20, 30, 60, 120]
});

export const gauge_uptime = new promclient.Gauge({
  name: "gauge_uptime",
  help: "uptime of current looker process in seconds"
});
