# Looker

Looker looks (measures). And [is attractive](https://www.lexico.com/definition/looker).

Looker is a Loki / Cortex testing and benchmarking tool.

Looker originated early 2020 as a black-box storage testing for Loki with strict and deep read validation.
Since then, it has evolved quite a bit.

## Local development

`cd` to looker's main directory. Set up NodeJS 16 with yarn:

```text
nvm install 16
nvm use 16
npm -g install yarn
```

Install dependencies:

```text
yarn
```

TSC-compile code base, watching for changes:

```text
yarn run tsc --watch
```

## Command line usage

Current `--help` output:

```text
usage: looker [-h] [--log-level LEVEL] [--metrics-mode] --n-concurrent-streams
              N_CONCURRENT_STREAMS --n-entries-per-stream-fragment
              N_ENTRIES_PER_STREAM_FRAGMENT
              [--n-fragments-per-push-message N_FRAGMENTS_PER_PUSH_MESSAGE]
              [--n-chars-per-msg N_CHARS_PER_MSG]
              [--log-start-time LOG_START_TIME]
              [--log-time-increment-ns LOG_TIME_INCREMENT_NS]
              [--metrics-time-increment-ms METRICS_TIME_INCREMENT_MS]
              [--max-concurrent-writes MAX_CONCURRENT_WRITES]
              [--max-concurrent-reads MAX_CONCURRENT_READS | --skip-read]
              [--read-n-streams-only READ_N_STREAMS_ONLY]
              [--compressability {min,max,medium}] [--n-cycles N_CYCLES]
              [--change-streams-every-n-cycles CHANGE_STREAMS_EVERY_N_CYCLES]
              [--label KEY VALUE] [--http-server-port HTTP_SERVER_PORT]
              (--stream-write-n-fragments STREAM_WRITE_N_FRAGMENTS | --stream-write-n-seconds STREAM_WRITE_N_SECONDS)
              [--stream-write-n-seconds-jitter J]
              [--fetch-n-entries-per-query FETCH_N_ENTRIES_PER_QUERY]
              [--retry-post-deadline-seconds RETRY_POST_DEADLINE_SECONDS]
              [--retry-post-min-delay-seconds RETRY_POST_MIN_DELAY_SECONDS]
              [--retry-post-max-delay-seconds RETRY_POST_MAX_DELAY_SECONDS]
              [--retry-post-jitter RETRY_POST_JITTER]
              [--bearer-token-file BEARER_TOKEN_FILE]
              apibaseurl

Looker test runner

positional arguments:
  apibaseurl            Loki API base URL (Cortex API base URL in metrics
                        mode)

optional arguments:
  -h, --help            show this help message and exit
  --log-level LEVEL     Set log level for output on stderr. One of: debug,
                        info, warning, error. Default: info
  --metrics-mode        metrics mode (Cortex) instead of logs mode (Loki) --
                        metrics mode was added later in a quick and dirty
                        fashion, still visible
  --n-concurrent-streams N_CONCURRENT_STREAMS
                        number of log streams to create per write/read cycle
                        (or number of metric streams)
  --n-entries-per-stream-fragment N_ENTRIES_PER_STREAM_FRAGMENT
                        number of log entries per log stream fragment (or
                        number of metric samples per fragment)
  --n-fragments-per-push-message N_FRAGMENTS_PER_PUSH_MESSAGE
                        number of stream fragments to serialize into a single
                        binary push message (HTTP POST request body), mixed
                        from different streams. Default: 1
  --n-chars-per-msg N_CHARS_PER_MSG
                        number of characters per log message (ignored in
                        metrics mode)
  --log-start-time LOG_START_TIME
                        Timestamp of the first sample for all synthetic log
                        streams.ISO 8601 / RFC3339Nano (tz-aware), example:
                        2020-02-20T17:46:37.27000000Z. Default: invocation
                        time. Does not apply in metrics mode (which is always
                        guided by the current wall time)
  --log-time-increment-ns LOG_TIME_INCREMENT_NS
                        time difference in nanonseconds between adjacent log
                        entries in a log stream (between log entry timestamps)
                        (ignored in metrics mode)
  --metrics-time-increment-ms METRICS_TIME_INCREMENT_MS
                        time difference in milliseconds between adjacent
                        samples in a time series
  --max-concurrent-writes MAX_CONCURRENT_WRITES
                        Maximum number of POST HTTP requests to perform
                        concurrently. Default: 0 (do as many as given by
                        --n-concurrent-streams).
  --max-concurrent-reads MAX_CONCURRENT_READS
                        Maximum number of GET HTTP requests to perform
                        concurrently during the read/validation phase.
                        Default: 0 (do as many as given by
                        --n-concurrent-streams).
  --skip-read           skip the readout in the write/read cycle, proceed to
                        the next cycle instead
  --read-n-streams-only READ_N_STREAMS_ONLY
                        Maximum number of streams to read (validate) in the
                        read phase of a write/read cycle. Use this if you want
                        to read (validate) less data than what was written.
                        The subset of streams is picked randomly at the
                        beginning of each read phase. Default: 0 (read back
                        everything that was written).
  --compressability {min,max,medium}
                        compressability characteristic of generated log
                        messages (ignored in metrics mode)
  --n-cycles N_CYCLES   number of write/read cycles to perform. Every cycle
                        generates a report.
  --change-streams-every-n-cycles CHANGE_STREAMS_EVERY_N_CYCLES
                        Use the same log/metric stream for N cycles, then
                        create a new set of streams (unique label sets).
                        Default: new streams are created with every write/read
                        cycle. For log streams, when a new stream is
                        initialized it re-uses the same synthetic start time
                        as set before (program invocation time or
                        log_start_time). Metric streams are always guided by
                        wall time.
  --label KEY VALUE     add a label key/value pair to all emitted log entries
  --http-server-port HTTP_SERVER_PORT
                        HTTP server listen port (serves /metrics Prometheus
                        endpoint). Default: try 8900-8990.
  --stream-write-n-fragments STREAM_WRITE_N_FRAGMENTS
                        within a write/read cycle, stop write (and enter read
                        phase) when this many fragments were written for a
                        log/metric stream
  --stream-write-n-seconds STREAM_WRITE_N_SECONDS
                        within a write/read cycle, stop write (and enter read
                        phase) after having written for approx. that many
                        seconds
  --stream-write-n-seconds-jitter J
                        add random number of seconds from interval [-J,J] to
                        --stream-write-n-seconds
  --fetch-n-entries-per-query FETCH_N_ENTRIES_PER_QUERY
                        Maximum number of log entries to fetch per query
                        during read/validation phase (honored in metric mode?
                        TODO)
  --retry-post-deadline-seconds RETRY_POST_DEADLINE_SECONDS
                        Maximum time spent retrying POST requests, in seconds
  --retry-post-min-delay-seconds RETRY_POST_MIN_DELAY_SECONDS
                        Minimal delay between POST request retries, in seconds
  --retry-post-max-delay-seconds RETRY_POST_MAX_DELAY_SECONDS
                        Maximum delay between POST request retries, in seconds
  --retry-post-jitter RETRY_POST_JITTER
                        Relative jitter to apply for calculating the retry
                        delay (1: max)
  --bearer-token-file BEARER_TOKEN_FILE
                        Read authentication token from file. Add header
                        `Authorization: Bearer <token>` to each HTTP request.
```

## Note snippets for running Looker

This section needs work.

### Example invocation: logs

These parameters are yours to think about them and play with.

Here ist just some inspiration.

### quick test (a few seconds)

```bash
<cmd> ${LOOKER_LOKI_API_BASE_URL} \
  --n-concurrent-streams 2 \
  --n-entries-per-stream-fragment 100 \
  --n-chars-per-msg 100 \
  --stop-write-after-n-fragments-per-stream 2
```

#### ~1 MB HTTP requests, small concurrency, write for ~30 s, then read

```bash
<cmd> ${LOKI_API_BASE_URL} \
  --n-concurrent-streams 10 \
  --n-entries-per-stream-fragment 12000 \
  --n-chars-per-msg 90 \
  --stop-write-after-n-seconds 30
```


### Run side-by-side with a local Prometheus to monitor Looker instance

Goal: run two containers side-by-side on the same host:

* looker, exposing /metrics
* Prometheus, scraping looker's /metrics endpoint, pushing into Cortex

Example Prometheus config:

```bash
$ cat local-prom.yaml
scrape_configs:
  - job_name: "looker"
    scrape_interval: 5s
    static_configs:
      - targets: ['localhost:8900']

remote_write:
  - url: https://prometheus.default.jp.opstrace.io/api/prom/push
    queue_config:
      batch_send_deadline: 5s
    tls_config:
      insecure_skip_verify: true
```

Invoke Prometheus:

```bash
docker run --net=host -v $(pwd)/local-prom.yaml:/etc/prometheus/prometheus.yml prom/prometheus
```


## Misc

### Usage as a TypeScript library

(really not a focus yet)

#### Logs

```javascript
import { DummyStream } from "./looker/logs";

const stream = new DummyStream({
  n_entries_per_stream_fragment: 10 ** 4,
  n_chars_per_message: 90,
  starttime: ZonedDateTime.now(),
  uniqueName: "example-dummystream",
  timediffNanoseconds: 100,
  includeTimeInMsg: true,
  labelset: {"custom-label-key": "foo"},
  compressability: "min"
});


// Generate 10 log stream fragments and push each fragment with an individual
// POST HTTP request to the Loki API.
await stream.postFragmentsToLoki(
  10,
  "https://loki-external.default.jpdev.opstrace.io:8443"
);
```
