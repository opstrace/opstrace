# Sending metrics with Prometheus

In this guide we show how to configure a Prometheus instance to securely send metrics to your Opstrace instance.

## Prerequisites

* An Opstrace instance.
* A decision: for which Opstrace tenant would you like to send data?
* An Opstrace tenant authentication token file (for the tenant of your choice). Also see [concepts](../../references/concepts.md).

## `remote_write` configuration block: the basics

A Prometheus instance can be instructed to replicate its state to a remote system by defining a [remote_write](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write) configuration block.

What follows is the basic structure of this configuration block to make Prometheus send data to your Opstrace instance:

```yaml
remote_write:
  - url: <string>
    bearer_token_file: <filename>
    tls_config:
      insecure_skip_verify: <boolean>
```

## Choosing `url`

This is the tenant-specific data API endpoint of an Opstrace instance for ingesting metrics.
The endpoint URL is constructed using the tenant name and the instance name:

```yaml
url: https://cortex.${TENANT_NAME}.${INSTANCE_NAME}.opstrace.io/api/v1/push
```

Example:

```yaml
url: https://cortex.default.test.opstrace.io/api/v1/push
```

## Choosing `bearer_token_file`

Your Opstrace instance exposes the metrics ingestion API securely.
For authenticating the client towards the Opstrace instance, the client has to present a tenant-specific data API authentication token with every request.

To achieve that, we use the `bearer_token_file` parameter:

Example:

```yaml
bearer_token_file: /var/run/default-tenant/tenant-api-token-default
```

## Choosing `tls_config`

TLS is used for establishing a secure, private transport between the Prometheus instance and the Opstrace instance.
By default, the Prometheus instance attempts to verify the certificate exposed by the Opstrace instance against its trust store, for establishing authenticity of the Opstrace instance towards Prometheus.
Depending on the `cert_issuer` instance configuration option (see [configuration](../../references/configuration.md)) you may want to disable server certificate verification for testing purposes.

This can be achieved via

```yaml
tls_config:
  insecure_skip_verify: true
```

This is required for example when using `letsencrypt-staging` as `cert_issuer`.

## Further references

The following resources provide further assistance in understanding and configuring Prometheus' `remote_write` protocol:

* [Prometheus docs: remote_write reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write)
* [Prometheus docs: remote_write best practices](https://prometheus.io/docs/practices/remote_write)
* [Prometheus docs: remote storage integrations](https://prometheus.io/docs/prometheus/latest/storage/#remote-storage-integrations)
* [Troubleshooting Prometheus remote_write](https://grafana.com/blog/2021/04/12/how-to-troubleshoot-remote-write-issues-in-prometheus/)
