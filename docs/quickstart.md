---
description: >-
  See it for yourself—get your hands dirty with Opstrace by creating a cluster and sending dummy data.
---

# Opstrace Quick Start

Try Opstrace by setting up a 3-node cluster inside your cloud account.
Send metrics and logs to it from your local machine, and query the data to test the end-to-end flow.

![quick start overview](https://share.balsamiq.com/c/ijnF4CDC5q8AEDuewqQhX7.png)

* You’ll have a _secure_, _horizontally-scalable_, _multi-tenant_, and _self-healing_ open source observability platform.
* Running the Opstrace cluster for an hour costs about $1.00.

## Step 0: Setup

Open a terminal and verify you have the following:

* For creating the cluster:
  * The [AWS Command Line Interface v2 (AWS CLI)](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html)
    * We recommend `AdministratorAccess` for this quick start; for additional info check out our [cloud permissions reference](./references/cloud-permissions.md).
    * While AWS and GCP are supported, we will focus on AWS in this quick start.
* For sending dummy data:
  * [Docker](https://docs.docker.com/install/)
  * [Docker Compose](https://docs.docker.com/compose/install/)

Note: the code blocks are all copy and pastable.

```bash
aws configure list
docker --version
docker-compose --version
```

Now, create an empty directory to use.
We will write some files locally (auth tokens and config files) that you will need to reference, so stay in this directory.
For example:

```bash
mkdir opstrace-quickstart && cd opstrace-quickstart
```

Download the latest Opstrace CLI binary from S3, which you will use to create the cluster (~50M compressed):

<!--tabs-->

### MacOS

```bash
# Download the CLI from S3 and extract it.
curl -L https://go.opstrace.com/cli-latest-macos | tar xjf -
# Test the extracted binary.
./opstrace --help
```

### Linux

```bash
# Download the CLI from S3 and extract it.
curl -L https://go.opstrace.com/cli-latest-linux | tar xjf -
# Test the extracted binary.
./opstrace --help
```

<!-- /tabs -->

If you see a proper help message, you're ready to go.
So let's get started.

## Step 1: Create a cluster

Choose an `OPSTRACE_CLUSTER_NAME` for your cluster (it must be 13 characters or less):

````markdown
<!--export-to-input-->

```bash
export OPSTRACE_CLUSTER_NAME=<choose_a_name>
```

<!--/export-to-input-->
````

The cluster name will globally identify you in our domain as `$OPSTRACE_CLUSTER_NAME.opstrace.io`, which we provide for you by default as a convenience.

Then, you'll create a simple cluster [configuration file](./references/cluster-configuration.md) with the most basic options.
Note that we define a tenant named `myteam` to send our application metrics to, which is separate from the `system` tenant that hosts the cluster-internal metrics.
Learn more about tenant isolation in our [key concepts references](./references/concepts.md#tenants).

```bash
cat <<EOF > opstrace-config.yaml
tenants:
  - myteam
env_label: quickstart
node_count: 3
cert_issuer: letsencrypt-prod
EOF
```

**Your input needed:** After you initiate the command below, a browser page is going to pop up asking you to sign in with a Google account.
(The URL will also be printed in the CLI output.)
This is so we can and provide a seamless user experience for our provided DNS.

Let's get things going:

```bash
./opstrace create aws $OPSTRACE_CLUSTER_NAME \
  -c opstrace-config.yaml
```

**Be patient:** Cluster creation takes on average 30 minutes on AWS (but it can go as long as 45 minutes).

**So you know:** The CLI is largely re-entrant. If it is interrupted while setting up cloud infrastructure you can re-invoke the same command and it will continue where it left off.
For additional information understanding and troubleshooting the `create` command, see our [CLI reference section](./references/cli.md#create).

When everything is done, you'll see the following log line:

`info: cluster creation finished: $OPSTRACE_CLUSTER_NAME (aws)`  

You now have a secure, scalable, multi-tenant, open standards-based observability platform running _inside_ your cloud account, right next to the software that you want to monitor.

Now that your Opstrace cluster is up and running, let's take a closer look.

## Step 2: Check the cluster

Before we proceed to send data to the cluster, let's check in on how the cluster is doing.
The Opstrace cluster monitors itself, so we have a lot of metrics about its own operation.
In this step, we will look at some key metrics about data coming into the cluster: total number of metrics and logs coming in across both the `myteam` and `system` [tenants](./references/concepts.md#tenants), ingestion latency, and also the write rate from the `myteam` tenant only.
Once we send data to the cluster in Step 4, these write rate graphs will be populated, which demonstrates the ability of the cluster to monitor different tenants independently or together.

Log in to the Grafana UI and look at the Quick Start Overview dashboard here:

```text
https://system.$OPSTRACE_CLUSTER_NAME.opstrace.io/grafana/d/2gd-0P3Wz3/system-overview?orgId=1&refresh=10&from=now-30m&to=now
```

## Step 3: Send data to the cluster

Next, let's send in some dummy data to the Opstrace cluster as if it were our own application. We'll generate a workload using some well-known Docker containers, push it to the cluster using small config files we'll provide, then query back the data to verify it got there.

Let's get started by creating the following observability workload on your laptop:

* Dummy metrics from [Avalanche](https://github.com/open-fresh/avalanche) scraped with [Prometheus](https://prometheus.io/), which will send them to the Opstrace cluster.
* Log messages from Avalanche and Prometheus scraped with [FluentD](https://www.fluentd.org/), which will send them to the Opstrace cluster.

**Launch:** Start the following workloads in the same terminal window you've been using thus far, as shown below in the code blocks below.
If you do open a new terminal, however, do be sure you're still in the correct directory since these commands will look in `pwd` for the [API token files](./references/concepts.md#anatomy-of-a-data-api-token-and-how-to-present-it) created during `opstrace create`, and be sure to have your `OPSTRACE_CLUSTER_NAME` environment variable set.
Create a file with the Prometheus configuration to send data to your Opstrace cluster:

```bash
# send metrics to the Opstrace cluster with Prometheus
cat <<EOF > prometheus.yml
  remote_write:
    - url: "https://cortex.myteam.$OPSTRACE_CLUSTER_NAME.opstrace.io/api/v1/push"
      bearer_token_file: /var/run/tenant/token
      queue_config:
        batch_send_deadline: 5s
  scrape_configs:
    - job_name: 'prometheus'
      static_configs:
        - targets: ['localhost:9090']
    - job_name: "avalanche"
      static_configs:
        - targets: ['avalanche:9001']
          labels:
            label: quickstart
  global:
    scrape_interval: 5s
EOF

```

Create a file with the FluentD configuration to send logs to your Opstrace cluster:

```bash
cat <<EOF > fluentd.conf
<source>
  @type forward
  port  24224
</source>

<filter avalanche.**>
    @type record_transformer
    enable_ruby true
    <record>
        container_name "avalanche"
    </record>
</filter>

<filter prometheus.**>
    @type record_transformer
    enable_ruby true
    <record>
        container_name "prometheus"
    </record>
</filter>

<match *>
  @type loki
  url https://loki.myteam.$OPSTRACE_CLUSTER_NAME.opstrace.io
  flush_interval 5s
  bearer_token_file /var/run/tenant/token
  extra_labels { "label": "quickstart" }

  <label>
    container_name
  </label>
</match>
EOF
```

Create the [docker-compose](https://docs.docker.com/compose/) file:

```bash
cat << EOF > docker-compose.yml
version: '3'
services:
  fluentd:
    image: opstrace/systemlog-fluentd:fe6d0d84-dev
    ports:
      - "24224:24224"
      - "24224:24224/udp"
    volumes:
      - ${PWD}/fluentd.conf:/fluentd/etc/fluent.conf
      - ${PWD}/tenant-api-token-myteam:/var/run/tenant/token
  prometheus:
    depends_on:
      - fluentd
    image: prom/prometheus:v2.22.1
    volumes:
      - ${PWD}/prometheus.yml:/etc/prometheus/prometheus.yml
      - ${PWD}/tenant-api-token-myteam:/var/run/tenant/token
    command:
      - --config.file=/etc/prometheus/prometheus.yml
    logging:
      driver: fluentd
      options:
        fluentd-address: localhost:24224
        tag: prometheus
  avalanche:
    depends_on:
      - fluentd
    image: quay.io/freshtracks.io/avalanche:latest
    command:
      - --metric-count=10
      - --value-interval=5
      - --label-count=5
      - --series-interval=30000
      - --metric-interval=3000
    ports:
     - 9001:9001
    logging:
      driver: fluentd
      options:
        fluentd-address: localhost:24224
        tag: avalanche
EOF
```

Now you will start everything in the background:

```bash
docker-compose up -d
```

Docker will start the containers and will show you output similar to the following (use `docker-compose ps` to view running containers):

```text
Starting opstrace-getting-started_fluentd_1 ... done
Starting opstrace-getting-started_prometheus_1 ... done
Starting opstrace-getting-started_avalanche_1  ... done
```

You now have dummy (random) metrics and logs being sent to the Opstrace cluster, as you might in the real world.

## Step 4: Validate the data

You can view this ingested data in the `myteam` [tenant](./references/concepts.md#tenant), which we specified in the configuration file, using the Grafana "explore" view:

```text
https://myteam.$OPSTRACE_CLUSTER_NAME.opstrace.io/grafana/explore?orgId=1&left=%5B%22now-30m%22,%22now%22,%22metrics%22,%7B%7D%5D
```

1. To query these metrics, first select the "metrics" data source in the upper left-hand corner.
2. Enter this simple query in the query dialog:

   ```text
   avalanche_metric_mmmmm_0_0{label="quickstart"}
   ```

3. Hit `Ctrl + <enter>` or press the "Run Query" button in the upper right-hand corner.

Now, let's query the logs:

1. Switch the data source in the upper left-hand corner to "Logs". You will see the same label filter applied to the log data.

As you can see, the data we sent to the Opstrace cluster in step 3 is indeed ingested as expected.

## Step 5: Add users and tenants

Congratulations!
You've walked through the majority of our foundational release, but we're [working on much more](./references/roadmap.md).
Before you clean up the cluster you've created, why not check out our UI which allows you to add users and tenants to the system:

```text
https://$OPSTRACE_CLUSTER_NAME.opstrace.io/login
```

## Step 6: Clean up

With this quick start we've shown you how easy it is to stand up an observability platform with long-term storage and security enabled by default.
We've done the heavy lifting behind the scenes; to configure this all on your own requires many more steps and manual maintenance.
And of course, because we are based on standard open source projects, you can move on to configure far more complex setups, depending on your specific needs.

When you're ready to shut everything down, just kill and remove the docker containers like this:

```bash
docker-compose down
```

You can then destroy the cluster—and save the log output to a file—as follows:

```bash
./opstrace destroy aws $OPSTRACE_CLUSTER_NAME
```

If something went wrong or was unpleasant, please send us your log files via email:

```bash
tar czf opstrace-logs.tgz opstrace_cli_*.log
```

Share the resulting file with us at [hello@opstrace.com](mailto:hello@opstrace.com).

## Step 6: Learn more

That's it! 👏

Congratulations, you're now an Opstrace user!
But there’s always more to discover...

<!-- TODO: need a better CTA here, or above -->
