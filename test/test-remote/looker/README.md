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
