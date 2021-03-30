---
description: See it for yourself—get your hands dirty with Opstrace by installing it in your account and sending dummy data.
---

<!-- markdownlint-disable MD033 -->

# Opstrace Quick Start

Try Opstrace by actually installing it inside your AWS account.
You'll send metrics and logs to it from your local machine, and query the data to test the end-to-end flow.

![quick start overview diagram](https://opstrace.com/images/docs/opstrace-quickstart-overview-v2.png)

If you want to see the quick start run through at over 10x speed, check out our video here:

<iframe width="560" height="315" src="https://www.youtube.com/embed/ooqBn1Q-y2Q" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>

## Step 0: Setup

Open a terminal and verify you have the following:

* For installing Opstrace you'll need the [AWS Command Line Interface v2 (AWS CLI)](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html)
  * We recommend `AdministratorAccess` for this quick start; for additional info check out our [cloud permissions reference](./references/aws.md).
  * While GCP is also fully supported, we will focus on AWS in this quick start.
* For sending dummy data to Opstrace, you'll need [Docker](https://docs.docker.com/install/) and [Docker Compose](https://docs.docker.com/compose/install/)

Note: the code blocks are all copy-and-pastable.

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

Download the latest Opstrace CLI binary from S3, which you will use to install Opstrace (~50M compressed):

<!--tabs-->

### MacOS

```bash
# Download the CLI from S3 and extract it
curl -L https://go.opstrace.com/cli-latest-macos | tar xjf -

# Test the extracted binary
./opstrace --help
```

### Linux

```bash
# Download the CLI from S3 and extract it
curl -L https://go.opstrace.com/cli-latest-linux | tar xjf -

# Test the extracted binary
./opstrace --help
```

<!-- /tabs -->

If you see a proper help message, you're ready to go.
So let's get started.

## Step 1: Install Opstrace

Choose an `OPSTRACE_NAME` for your Opstrace installation (it must be 13 characters or less):

<!--export-to-input-->

```bash
export OPSTRACE_NAME=<choose_a_name>
```

<!--/export-to-input-->

The name will globally identify you in our domain as `$OPSTRACE_NAME.opstrace.io`, which we provide for you by default as a convenience.

Then, you'll create a simple [configuration file](./references/cluster-configuration.md) with the most basic options.
Note that we define two tenants named `staging` and `prod` that are separate from the `system` tenant that hosts internal metrics about Opstrace.
We will send our application metrics to `staging` to demonstrate how data can be isolated between logical units such as deployment environments.
Learn more about tenant isolation in our [key concepts references](./references/concepts.md#tenants).

```bash
cat <<EOF > opstrace-config.yaml
tenants:
  - staging
  - prod
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
./opstrace create aws $OPSTRACE_NAME \
  -c opstrace-config.yaml
```

**Be patient:** Installation takes on average 30 minutes on AWS (but it can go as long as 45 minutes).

**So you know:** The CLI is largely re-entrant. If it is interrupted while setting up cloud infrastructure you can re-invoke the same command and it will continue where it left off.
For additional information understanding and troubleshooting the `create` command, see our [CLI reference section](./references/cli.md#create).

When everything is done, you'll see the following log line:

`info: cluster creation finished: $OPSTRACE_NAME (aws)`

In case of any **installation errors** check the [known issues section](./guides/administrator/troubleshooting.md#known-issues) or search our [GitHub issues](https://github.com/opstrace/opstrace/issues).

You now have a secure, scalable, multi-tenant, open standards-based observability platform running _inside_ your cloud account, right next to the software that you want to monitor.

Now that Opstrace is up and running, let's take a closer look.

## Step 2: Send data to Opstrace

Next, let's send in some dummy data to Opstrace as if it were our own application.
We'll generate a workload using some well-known Docker containers, push it to Opstrace using small config files we'll provide, then query back the data to verify it got there.

Let's get started by creating the following workload on your laptop:

* Dummy metrics generated by [Avalanche](https://github.com/open-fresh/avalanche) and scraped with [Prometheus](https://prometheus.io/).
* Log messages from Avalanche and Prometheus scraped with [FluentD](https://www.fluentd.org/).

**Launch:** Start the following workloads in the same terminal window you've been using thus far, as shown in the code blocks below.
If you do open a new terminal, however, do be sure you're still in the correct directory since these commands will look in `pwd` for the [API token files](./references/concepts.md#anatomy-of-a-data-api-token-and-how-to-present-it) created during `opstrace create`, and be sure to have your `OPSTRACE_NAME` environment variable set.
Create a file with the Prometheus configuration to send data to Opstrace:

```bash
cat <<EOF > prometheus.yml
  remote_write:
    - url: "https://cortex.staging.$OPSTRACE_NAME.opstrace.io/api/v1/push"
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

Create a file with the FluentD configuration:

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
  url https://loki.staging.$OPSTRACE_NAME.opstrace.io
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
      - ${PWD}/tenant-api-token-staging:/var/run/tenant/token
  prometheus:
    depends_on:
      - fluentd
    image: prom/prometheus:v2.22.1
    volumes:
      - ${PWD}/prometheus.yml:/etc/prometheus/prometheus.yml
      - ${PWD}/tenant-api-token-staging:/var/run/tenant/token
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

You now have dummy (random) metrics and associated logs (simulating a real app you may have) being sent to your isolated [tenant](./references/concepts.md#tenants).

## Step 3: Validate the data

Let's view the data in our `staging` tenant using the Grafana "explore" view:

```text
https://staging.$OPSTRACE_NAME.opstrace.io/grafana/explore?orgId=1&left=%5B%22now-30m%22,%22now%22,%22metrics%22,%7B%7D%5D
```

1. To query these metrics, first select the "metrics" data source in the upper left-hand corner.
2. Enter this simple query in the query dialog:

   ```text
   avalanche_metric_mmmmm_0_0{label="quickstart"}
   ```

3. Hit `Ctrl + <enter>` or press the "Run Query" button in the upper right-hand corner.

Now, let's query the logs:

1. Switch the data source in the upper left-hand corner to "Logs". You will see the same label filter applied to the log data.

As you can see, the data we sent to Opstrace in step 3 is indeed ingested as expected.

You can also see that the `prod` tenant is empty, completely separated from `staging`:

```text
https://prod.$OPSTRACE_NAME.opstrace.io/grafana/explore?orgId=1&left=%5B%22now-30m%22,%22now%22,%22metrics%22,%7B%7D%5D
```

## Step 4: Add users and tenants

Congratulations!
You've walked through the majority of our foundational release, but we're [working on much more](./references/roadmap.md).
Before you uninstall Opstrace, why not check out our UI which allows you to add users and tenants to the system:

```text
https://$OPSTRACE_NAME.opstrace.io/login
```

## Step 5: Clean up

With this quick start we've shown you how easy it is to stand up an observability platform with long-term storage and security enabled by default.
We've done the heavy lifting behind the scenes; to configure this all on your own requires many more steps and manual maintenance.
And of course, because we are based on standard open source projects, you can move on to configure far more complex setups, depending on your specific needs.

When you're ready to shut everything down, just kill and remove the docker containers like this:

```bash
docker-compose down
```

You can then uninstall Opstrace:

```bash
./opstrace destroy aws $OPSTRACE_NAME
```

If something went wrong or was unpleasant, please send us your log files via email:

```bash
tar czf opstrace-logs.tgz opstrace_cli_*.log
```

Share the resulting file with us at [hello@opstrace.com](mailto:hello@opstrace.com).

## Step 6: Learn more

That's it! 👏

<!-- markdownlint-disable MD044 -->
Join our [community Slack](https://go.opstrace.com/community) and follow us on [Twitter @opstrace](https://twitter.com/opstrace).
Let us know what you thought of the quick start—we like any and all feedback.
<!-- markdownlint-enable MD044 -->

To learn more about how to use Opstrace, check out our Administrator and User Guides.
If you'd like to hack on Opstrace, feel free to [fork our repository](https://github.com/opstrace/opstrace/network/members) and set up your [dev environment](https://opstrace.com/docs/guides/contributor/setting-up-your-dev-env).

Thank you. 🙏
