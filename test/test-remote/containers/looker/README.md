# Looker

[Looker looks (measures) and is attractive.](https://www.lexico.com/definition/looker).

Looker is a Loki API testing tool.

## Build and push container image

```bash
$ cd test/test-remote/containers/looker
$ make image
$ make publish
docker push opstrace/looker:b2228f7f-dev
The push refers to repository [docker.io/opstrace/looker]
...
b2228f7f-dev: digest: sha256:23b0537c614de4960b4d0d4fdeb43e389bd2c1dd212395446a8079060a0f2742
```

`make publish-as-latest` might be a convenient helper.

## Create a GCP VM, create opstrace cluster, perform tests

### Create load generator machine (GCP VM)

```bash
$ gcloud compute instances create logtest-$(openssl rand -hex 3) \
    --zone=us-west2-a --machine-type n1-standard-4 \
    --image-project cos-cloud --image-family cos-stable

Created [https://www.googleapis.com/compute/v1/projects/vast-pad-240918/zones/us-west2-a/instances/logtest-0d2045].
NAME            ZONE        MACHINE_TYPE   PREEMPTIBLE  INTERNAL_IP  EXTERNAL_IP    STATUS
logtest-0d2045  us-west2-a  n1-standard-4               10.168.0.13  35.235.119.96  RUNNING
```

### Create Opstrace cluster

was outdated

### SSH into load generator machine

SSH into load machine:

```bash
$ gcloud compute ssh --zone us-west2-a logtest-0d2045
...
Warning: Permanently added 'compute.4529631245910703536' (ED25519) to the list of known hosts.
```

Maybe do this in two terminals, one for launching things, another one
for keeping an eye on things (to run `top`, `perf`, ...).

### Pull looker container image

```bash
$ docker pull opstrace/looker:b2228f7f-dev
# or latest: docker pull opstrace/looker:latest
```

### Run looker

Set Loki API base URL in env, e.g.:

```bash
export LOOKER_LOKI_API_BASE_URL=https://loki-external.default.jp.opstrace.io:8443
```

What follows are two examples for invoking looker in a container.

Run containerized looker with a quicktest config (log goes to terminal):

```bash
  docker run -v `pwd`:/rundir -it --net=host \
  opstrace/looker:latest \
  looker ${LOOKER_LOKI_API_BASE_URL} \
    --n-concurrent-streams 2 \
    --n-entries-per-stream-fragment 100 \
    --n-chars-per-msg 100 \
    --stop-write-after-n-fragments-per-stream 2
```

Run looker with stdout/err redirected to a file (do this so that the stream to
your terminal is no bottleneck), and define custom labels on emitted log
streams:

```bash
  docker run -v $(pwd):/rundir --net=host \
  opstrace/looker:latest \
  looker ${LOOKER_LOKI_API_BASE_URL} \
    --n-concurrent-streams 10 \
    --n-entries-per-stream-fragment 10000 \
    --n-chars-per-msg 100 \
    --label hostname $(hostname) \
    --stop-write-after-n-fragments-per-stream 2 &> looker-$(date +%Y%m%d-%H%M%S).outerr
```

* `-v $(pwd):/rundir` is for mounting the current working directory on the host
  into the container at `/rundir` so that the output file(s) written by looker
  will land on the host.
* `--net=host` exposes the HTTP server on the host.

### Look at data

Look at report JSON, for example:

```bash
$ cat looker-1588769553-WXgeUxmIzUug.report.json
{
  "argv": [
    "/usr/local/bin/node",
    "/build/looker",
    "https://loki-external.default.jp.opstrace.io:8443",
    "--n-concurrent-streams",
    "10",
    "--n-entries-per-stream-fragment",
    "10000",
    "--n-chars-per-msg",
    "100",
    "--label",
    "hostname",
    "logtest-9caa4d",
    "--stop-write-after-n-fragments-per-stream",
    "2"
  ],
  "config": {
    "lokiurl": "https://loki-external.default.jp.opstrace.io:8443",
    "n_concurrent_streams": 10,
    "n_entries_per_stream_fragment": 10000,
    "n_chars_per_msg": 100,
    "log_start_time": "2020-05-06T12:52:33.549000000Z",
    "log_time_increment_ns": 1,
    "additional_labels": [
      [
        "hostname",
        "logtest-9caa4d"
      ]
    ],
    "http_server_port": 8900,
    "write_n_fragments_per_stream": 2,
    "write_n_seconds": null,
    "runid": "looker-1588769553-WXgeUxmIzUug"
  },
  "invocationTime": "2020-05-06T12:52:33.549000000Z",
  "stats": {
    "write": {
      "nEntriesSent": 200000,
      "nCharsSent": 20000000,
      "entriesSentPerSec": 20829.31522173468,
      "megacharsSentPerSec": 2.082931522173468,
      "durationSeconds": 9.601851903
    },
    "read": {
      "nEntriesRead": 200000,
      "nCharsRead": 20000000,
      "entriesReadPerSec": 181696.53219077078,
      "megacharsReadPerSec": 0.1816965321907708,
      "durationSeconds": 1.100736473
    }
  }
}

```

Look at Opstrace cluster dashboard(s), keep note of things, make screenshots. Think.

## Example configs

Set Loki API base URL in env, e.g.:

```bash
export LOOKER_LOKI_API_BASE_URL=https://loki-external.default.jp.opstrace.io:8443
```

### quick test (a few seconds)

```bash
$ <cmd> ${LOOKER_LOKI_API_BASE_URL} \
--n-concurrent-streams 2 \
--n-entries-per-stream-fragment 100 \
--n-chars-per-msg 100 \
--stop-write-after-n-fragments-per-stream 2
```

### ~1 MB HTTP requests, higher concurrency, write for ~30 s, then read

```bash
<cmd> ${LOOKER_LOKI_API_BASE_URL} \
--n-concurrent-streams 3 \
--n-entries-per-stream-fragment 12000 \
--n-chars-per-msg 90 \
--stop-write-after-n-seconds 30
```

... these parameters are yours to think about them and play with.

Note that currently the Loki API rejects HTTP requests with a body larger than
1 MB.

## Run local Prom side-by-side with looker

Goal: run two containers side-by-side on the same host:

* looker, exposing /metrics
* Prometheus, scraping looker's /metrics endpoint, pushing into opstrace cluster.

Example Prometheus config:

```bash
$ cat local-prom.yaml
scrape_configs:
  - job_name: "looker"
    scrape_interval: 5s
    static_configs:
      - targets: ['localhost:8900']

remote_write:
  - url: https://prometheus-external.default.jp.opstrace.io:8443/api/prom/push
    queue_config:
      batch_send_deadline: 5s
    tls_config:
      insecure_skip_verify: true
```

Invoke Prometheus:

```bash
docker run --net=host -v $(pwd)/local-prom.yaml:/etc/prometheus/prometheus.yml prom/prometheus
```
