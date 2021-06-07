# Sending logs with FluentD

In this guide we show how to configure a FluentD instance to securely send logs to your Opstrace cluster.

We appreciate FluentD for its robustness, especially with respect to log file rotation handling, node-local log data [buffer management](https://docs.fluentd.org/buffer), [flushing parameterization](https://docs.fluentd.org/configuration/buffer-section#flushing-parameters) and its mature error handling architecture.

It is worth mentioning that FluentD has decent debuggability, with insightful logging around retries and errors in particular.

## Prerequisites

* An Opstrace cluster.
* A decision: for which Opstrace tenant would you like to send data?
* An Opstrace tenant authentication token file (for the tenant of your choice). Also see [concepts](../../references/concepts.md).

## FluentD output configuration block: the basics

A FluentD instance can be instructed to send logs to an Opstrace cluster by using the `@type loki` output plugin ([on GitHub](https://github.com/grafana/loki/tree/main/clients/cmd/fluentd), [on rubygems.org](https://rubygems.org/gems/fluent-plugin-grafana-loki)).

What follows is an example for a block matching all log entries, and for sending them to your Opstrace cluster:


```xml
<match **>
  @type loki
  url <string>
  insecure_tls <boolean>
  bearer_token_file <filepath>
</match>
```

## Choosing `url`

This is the tenant-specific data API endpoint of an Opstrace cluster for ingesting metrics.
The endpoint URL is constructed using the tenant name and the cluster name:

```xml
url https://loki.${TENANT_NAME}.${CLUSTER_NAME}.opstrace.io/loki/api/v1/push
```

Example:

```xml
url https://loki.default.testcluster.opstrace.io/loki/api/v1/push
```

## Choosing `bearer_token_file`

Your Opstrace cluster exposes the logs ingestion API securely.
For authenticating the client towards the Opstrace cluster, the client has to present a tenant-specific data API authentication token with every request.

To achieve that, we use the `bearer_token_file` parameter. Example:

```xml
bearer_token_file /var/run/default-tenant/tenant-api-token-default
```

## Choosing `insecure_tls`

TLS is used for establishing a secure, private transport between the FluentD instance and the Opstrace cluster.
By default, FluentD attempts to verify the certificate exposed by the Opstrace cluster against its trust store, for establishing authenticity of the Opstrace cluster towards itself.
Depending on the `cert_issuer` cluster configuration option (see [cluster configuration](../../references/configuration.md)) you may want to disable server certificate verification for testing purposes, which can be achieved via

```xml
insecure_tls true
```

This is required for example when using `letsencrypt-staging` as `cert_issuer`.

## Advanced flushing and buffering: define a `buffer` section

We recommend reading into the [FluentD Buffer Section](https://docs.fluentd.org/configuration/buffer-section) documentation.
For example, when choosing a node-local FluentD buffer of [`@type file`](https://docs.fluentd.org/buffer/file) one can maximize the likelihood to recover from failures without losing valuable log data (the node-local persistent buffer can  be flushed eventually -- FluentD's default retrying timeout is 3 days). What follows is a configuration structure that serves as a starting point for more advanced flushing and buffering configuration:

```xml
<match **>
  @type loki
  url <string>
  insecure_tls <boolean>
  bearer_token_file <filepath>
  <buffer>
    @type file
    path <filepath>
    chunk_limit_size 512kb
    flush_interval 3s
  </buffer>
</match>
```

Note that FluentD can also back up log entries that it failed to flush.

## Further references

* [Loki output plugin on GitHub](https://github.com/grafana/loki/tree/main/clients/cmd/fluentd)
* [FluentD Buffer configuration](https://docs.fluentd.org/configuration/buffer-section) (buffering parameters, flushing parameters, retrying parameters)

