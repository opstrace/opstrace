# Sending logs with Promtail

In this guide we show how to configure a [Promtail](https://github.com/grafana/loki/tree/master/cmd/promtail) instance to securely send logs to your Opstrace cluster.

## Prerequisites

* An Opstrace cluster.
* A decision: for which Opstrace tenant would you like to send data?
* An Opstrace tenant authentication token file (for the tenant of your choice). Also see [concepts](../../references/concepts.md).

## `@type loki` output configuration block: the basics

Promtail can be instructed to send logs to an Opstrace cluster using the following basic configuration structure:

```yaml
client:
  url: <string>
  bearer_token_file: <filename>
  tls_config:
    insecure_skip_verify: <boolean>
```

## Choosing `url`

This is the tenant-specific data API endpoint of an Opstrace cluster for ingesting metrics.
The endpoint URL is constructed using the tenant name and the cluster name:

```yaml
url: https://loki.${TENANT_NAME}.${CLUSTER_NAME}.opstrace.io/loki/api/v1/push
```

Example:

```yaml
url: https://loki.default.testcluster.opstrace.io/loki/api/v1/push
```

## Choosing `bearer_token_file`

Your Opstrace cluster exposes the logs ingestion API securely.
For authenticating the client towards the Opstrace cluster, the client has to present a tenant-specific data API authentication token with every request.

To achieve that, we use the `bearer_token_file` parameter:

Example:

```yaml
bearer_token_file: /var/run/default-tenant/tenant-api-token-default
```

## Choosing `insecure_tls`

TLS is used for establishing a secure, private transport between the Promtail instance and the Opstrace cluster.
By default, FluentD attempts to verify the certificate exposed by the Opstrace cluster against its trust store, for establishing authenticity of the Opstrace cluster towards Promtail.
Depending on the `cert_issuer` cluster configuration option (see [cluster configuration](../../references/cluster-configuration.md)) you may want to disable server certificate verification for testing purposes.

This can be achieved via

```yaml
tls_config:
  insecure_skip_verify: true
```

This is required for example when using `letsencrypt-staging` as `cert_issuer`.

## Further references

* [Configuring Promtail: reference](https://github.com/grafana/loki/blob/master/docs/sources/clients/promtail/configuration.md)
* [Troubleshooting Promtail](https://github.com/grafana/loki/blob/master/docs/sources/clients/promtail/troubleshooting.md)
