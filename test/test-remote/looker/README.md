# Looker

Looker looks (measures). And [is attractive](https://www.lexico.com/definition/looker).

Looker is a Loki / Cortex testing and benchmarking tool.

Looker originated early 2020 as a black-box storage testing for Loki with strict and deep read validation.
Since then, it has evolved quite a bit.


## Concepts

### Write/read cycle

Looker operates in write/read cycles.
Each cycle starts with a write phase followed by a read phase.
The major purpose of the read phase is to perform data validation; it confirms that data that was written in the write phase can be read back.

The strictness and extent of the readout is flexible:
the read phase can be skipped entirely or configured to do a sparse readout so that after all the ratio between write and read load can be chosen rather freely.
This enables a wide set of load generation and benchmarking use cases.

In the strictest configuration, all individual log entries and metric samples are required to be returned exactly as previously written.
Some of that validation is implemented with checksumming (so that the bulk of the payload data does not need to be kept in memory between write and read phase).

### Wall time coupling

Looker implements a loose coupling between wall time and the synthetic time used for sample generation.
This loose wall time coupling allows for pushing data to an ingest system which does not accept data that is either too old or too new compared to is own perspective on current wall time.

Looker tries to be CPU-bound which also implies that it wants to generate log/metric samples as quickly as it can.

The timestamps associated with log/metric samples are synthetically generated to allow for strict/deep read validation.

By default, the synthetic time series start time is chosen randomly from an interval in the past compared to current wall time. Specifically, from the interval `[now-maxLagSeconds, now-minLagSeconds)`.
The meaning of `maxLagSeconds` and `minLagSeconds` is explained below.

By default, the synthetic time source used for time series generation is guided by wall time through a loose coupling mechanism.
When synthetic time passes faster than wall time that mechanism throttles sample generation when getting too close to `now`, as defined by `minLagSeconds`. That is, this mechanism guarantees that each generated sample has a timestamp at least as old as `now-minLagSeconds` (with `now` approximately being the sample generation time).

When the synthetic time source passes slower than wall time then the coupling mechanism compensates for that by a forward-leap method:
if the last generated sample is older than `now-maxLagSeconds` then the next generated sample will have a timestamp very close to `now-minLagSeconds`.



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
usage: looker [-h] [--log-level LEVEL] [--metrics-mode] --n-series N
                --n-samples-per-series-fragment N
                [--n-fragments-per-push-message N] [--n-chars-per-msg N]
                [--log-start-time LOG_START_TIME] [--log-time-increment-ns N]
                [--metrics-time-increment-ms N] [--max-concurrent-writes N]
                [--max-concurrent-reads N | --skip-read]
                [--read-n-series-only N] [--compressability {min,max,medium}]
                [--n-cycles N] [--change-series-every-n-cycles N]
                [--label KEY VALUE] [--http-server-port HTTP_SERVER_PORT]
                (--cycle-stop-write-after-n-fragments N | --cycle-stop-write-after-n-seconds N)
                [--cycle-stop-write-after-n-seconds-jitter J]
                [--retry-post-deadline-seconds RETRY_POST_DEADLINE_SECONDS]
                [--retry-post-min-delay-seconds RETRY_POST_MIN_DELAY_SECONDS]
                [--retry-post-max-delay-seconds RETRY_POST_MAX_DELAY_SECONDS]
                [--retry-post-jitter FLOAT]
                [--bearer-token-file BEARER_TOKEN_FILE]
                [--invocation-id INVOCATION_ID]
                apibaseurl

Looker is a Loki / Cortex testing and benchmarking tool. Looker originated as
a black-box storage testing program for Loki with strict and deep read
validation. Since then, it has evolved quite a bit.

positional arguments:
  apibaseurl            Push API base URL (/loki/api/v1/push and /api/v1/push
                        are prepended automatically in logs and metrics mode,
                        respectively).

optional arguments:
  -h, --help            show this help message and exit
  --log-level LEVEL     Set log level for output on stderr. One of: debug,
                        info, warning, error. Default: info
  --metrics-mode        'Metrics mode' (Cortex) instead of 'Logs mode' (Loki)
  --n-series N          Number of synthetic time series to generate and
                        consume from in each write/read cycle.
  --n-samples-per-series-fragment N
                        Number of samples (log entries or metric samples) to
                        put into each time series fragment. A time series
                        fragment is a distinct set of samples in chronological
                        order. A push message is comprised of one or more time
                        series fragments (with F fragments from F different
                        time series -- a push message generated by Looker
                        never containsmore than one time series fragment from
                        the same time series
  --n-fragments-per-push-message N
                        number of stream fragments to serialize into a single
                        binary push message (HTTP POST request body), mixed
                        from different streams. Default: 1
  --n-chars-per-msg N   number of characters per log message (ignored in
                        metrics mode)
  --log-start-time LOG_START_TIME
                        This disables the loose coupling of synthetic time to
                        wall time and defines the timestamp of the first
                        sample for all synthetic log streams. Does not apply
                        in metrics mode. Is useful when writing to Loki that
                        is configured to allow ingesting log samples far from
                        the past or future. Must be provided in RFC3339
                        notation. Note that across cycles the same start time
                        is used
  --log-time-increment-ns N
                        time difference in nanonseconds between adjacent log
                        entries in a log stream (between log entry timestamps)
                        (ignored in metrics mode)
  --metrics-time-increment-ms N
                        time difference in milliseconds between adjacent
                        samples in a time series
  --max-concurrent-writes N
                        Maximum number of POST HTTP requests to perform
                        concurrently. Default: use 10 concurrent writers or
                        less if --n-series is smaller.
  --max-concurrent-reads N
                        Maximum number of GET HTTP requests to perform
                        concurrently during the read/validation phase.
                        Default: use 10 concurrent writers or less if
                        --n-series is smaller.
  --skip-read           skip the readout in the write/read cycle, proceed to
                        the next cycle instead
  --read-n-series-only N
                        Maximum number of series to read (validate) in the
                        read phase of a write/read cycle. Use this if you want
                        to read (validate) less data than what was written.
                        The subset of series is picked randomly at the
                        beginning of each read phase. Default: 0 (read back
                        everything that was written).
  --compressability {min,max,medium}
                        compressability characteristic of generated log
                        messages (ignored in metrics mode)
  --n-cycles N          Number of write/read cycles to perform before
                        terminating the program. Every cycle allows for
                        (potentially sparse) read validation of what was
                        previously written, and also generates a performance
                        report. Default: 0 (perform an infinite amount of
                        cycles).
  --change-series-every-n-cycles N
                        Use the same log/metric time series for N cycles, then
                        create a new set of series (unique label sets). If set
                        to 0 then the initial set of time series is reused for
                        the process lifetime (the default).
  --label KEY VALUE     add a label key/value pair to all emitted log entries
  --http-server-port HTTP_SERVER_PORT
                        HTTP server listen port (serves /metrics Prometheus
                        endpoint). Default: try 8900-8990.
  --cycle-stop-write-after-n-fragments N
                        Cycle write phase stop criterion A: stop write (and
                        enter read phase) when this many fragments were
                        written for each time series. Default: 0 (never enter
                        the read phase).
  --cycle-stop-write-after-n-seconds N
                        Cycle write phase stop criterion A: stop write (and
                        enter read phase) having written for approximately
                        that many seconds. Default: 0 (never enter the read
                        phase).
  --cycle-stop-write-after-n-seconds-jitter J
                        add random number of seconds from interval [-J,J] to
                        --cycle-stop-write-after-n-seconds
  --retry-post-deadline-seconds RETRY_POST_DEADLINE_SECONDS
                        Maximum time spent retrying POST requests, in seconds
  --retry-post-min-delay-seconds RETRY_POST_MIN_DELAY_SECONDS
                        Minimal delay between POST request retries, in seconds
  --retry-post-max-delay-seconds RETRY_POST_MAX_DELAY_SECONDS
                        Maximum delay between POST request retries, in seconds
  --retry-post-jitter FLOAT
                        Relative jitter to apply for calculating the retry
                        delay (1: max)
  --bearer-token-file BEARER_TOKEN_FILE
                        Read authentication token from file. Add header
                        `Authorization: Bearer <token>` to each HTTP request.
  --invocation-id INVOCATION_ID
                        Name of this looker instance to be included in labels.
                        By default a random looker-<X> string is used. If read
                        validation is enabled then care should be taken to
                        ensure uniqueness at the server.
```

## Note snippets for running / operating Looker

This section needs work.

### Run side-by-side with a local Prometheus to monitor Looker

Goal: run a Prometheus instance side-by-side with Looker (or multiples Lookers) on the same host.
The Prometheus instance ("pusher prom") then scrapes looker's /metrics endpoint, and pushes data into Cortex in an Opstrace instance.

Example Prometheus config:

`local-prom.yaml`:

```
scrape_configs:
  - job_name: "looker_pusher_prom"
    scrape_interval: 1s
    static_configs:
      - targets: ['localhost:9090']
  - job_name: "looker"
    scrape_interval: 5s
    static_configs:
      - targets: [
          'localhost:8900',
          'localhost:8901',
          'localhost:8902',
          'localhost:8903',
          'localhost:8904',
          'localhost:8905',
          'localhost:8906',
          'localhost:8907',
          'localhost:8908',
          'localhost:8909',
          'localhost:8910',
          'localhost:8911',
          'localhost:8912',
          ]

remote_write:
  - url: https://cortex.fun.jpsep01.opstrace.io/api/v1/push
    queue_config:
        capacity: 30000
        max_samples_per_send: 10000
        batch_send_deadline: 10s
        min_backoff: 500ms
        max_backoff: 10s
        max_shards: 20

    tls_config:
      insecure_skip_verify: true

    bearer_token_file: /prom_push_auth_token
```

Edit the `remote_write` URL.
Write as `local-prom.yaml`.


Start:

```
$ docker run --net=host \
  -v $(pwd)/tenant-api-token-loadtest:/prom_push_auth_token \
  -v $(pwd)/local-prom.yaml:/etc/prometheus/prometheus.yml \
  prom/prometheus

...
ts=2021-03-05T14:55:39.793Z caller=dedupe.go:112 component=remote level=info remote_name=3b4271 url=https://cortex.loadtest.jpload-1614953111.opstrace.io/api/v1/push msg="Starting WAL watcher" queue=3b4271
ts=2021-03-05T14:55:39.793Z caller=dedupe.go:112 component=remote level=info remote_name=3b4271 url=https://cortex.loadtest.jpload-1614953111.opstrace.io/api/v1/push msg="Starting scraped metadata watcher"
ts=2021-03-05T14:55:39.794Z caller=dedupe.go:112 component=remote level=info remote_name=3b4271 url=https://cortex.loadtest.jpload-1614953111.opstrace.io/api/v1/push msg="Replaying WAL" queue=3b4271
level=info ts=2021-03-05T14:55:39.798Z caller=main.go:959 msg="Completed loading of configuration file" filename=/etc/prometheus/prometheus.yml totalDuration=5.020871ms remote_storage=320.149µs web_handler=210ns query_engine=500ns scrape=4.445728ms scrape_sd=22.195µs notify=603ns notify_sd=1.294µs rules=1.217µs
level=info ts=2021-03-05T14:55:39.798Z caller=main.go:751 msg="Server is ready to receive web requests."
ts=2021-03-05T14:55:45.114Z caller=dedupe.go:112 component=remote level=info remote_name=3b4271 url=https://cortex.loadtest.jpload-1614953111.opstrace.io/api/v1/push msg="Done replaying WAL" duration=5.320300262s
...
```

This generates a bunch of metrics with the label `{job="looker"}`.

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




## Misc

### Usage as a TypeScript library

(really not a focus yet)

#### Logs

```javascript
import { DummyStream } from "./looker/logs";

const stream = new DummyStream({
  n_samples_per_series_fragment: 10 ** 4,
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
