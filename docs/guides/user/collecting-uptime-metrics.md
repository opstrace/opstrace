# Uptime Metrics

Prometheus supports a wide range of exporters for getting metrics out of other systems and into Prometheus.
This guide describes how to use the Blackbox exporter to collect metrics on the status of other systems using one or more _probes_ and _targets_.
For example you can set up a probe that configures querying a website over HTTP, and then configure targets for each website that you want to check.
The Blackbox exporter will then produce several metrics for those websites, such as whether they were responsive, the HTTP response code they returned, and the latency of the request.

In this guide we will show you how to set up a working Blackbox exporter in Opstrace for a few common use cases.
You will provide Opstrace with the exporter configuration, and then Opstrace will automatically deploy a stock image of the Blackbox exporter with the configuration you provided.
Opstrace will also configure Prometheus to fetch the metrics for each target that you listed in the configuration.
Opstrace will also ensure that the resulting metrics will be tagged with the `module` and `target` that they came from, making it straightforward to differentiate metrics fetched across several different targets.

## How It Works

Most Prometheus exporters have a single `/metrics` endpoint for Prometheus to query.
The Blackbox exporter is different, where it expects Prometheus to specify `module` and `target` parameters against a dynamic `/probe` endpoint.
For example, Prometheus can be configured to query `/probe?module=http_2xx&target=opstrace.com`.
The Blackbox exporter will then execute the `http_2xx` module against the `opstrace.com` target.
Blackbox exporter instance can therefore serve multiple modules and multiple probes, as long as Prometheus is configured to query for them.

The Blackbox Exporter supports [multiple module types](https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md).
For example it can check the status of a DNS record, an arbitrary TCP socket, or a TLS certificate.
Each of these results in a lot of metrics about the query result.
The flexibility this provides can be quite powerful, allowing you to e.g. check that a site or socket is online, or to perform a particular HTTP RPC and see how long it takes to complete.

<!-- TODO diagram of blackbox exporter with multiple modules/targets, being polled by prometheus -->

When setting up the Blackbox exporter, we provide two things to Opstrace in a configuration object:

* Module configurations to perform probes against. This configures how queries should behave.
* Targets to execute against the modules. This is the list of things to query.

When you provide the configuration object, the following will occur:

1. The configuration is stored into an internal Postgres database
2. In the Opstrace Kubernetes cluster, a Blackbox exporter is launched as a Deployment with the module configuration, and the list of probes are launched as one or more .
3. The deployed exporter configures the provided list of modules.
4. The Prometheus operator configures Prometheus to query the exporter against the provided list of targets, with relabeling configuration to apply labels to the responses.

## Example configuration

Here is an example of how you can configure the Blackbox exporter by submitting a `POST` request to your Opstrace cluster.
The query must contain an Authorization header for the desired Opstrace tenant.
This is not meant to be an exaustive reference, for more information on the available options, refer to the [Blackbox exporter documentation](https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md).

```bash
$ echo '
name: example-blackbox-exporter
type: blackbox
config:
  probes: # required, list of probes to collect. args match HTTP params
  - target: prometheus.io
    module: http_2xx
  - target: example.com
    module: http_2xx
  - target: 1.1.1.1
    module: dns_opstrace_mx
  - target: 8.8.8.8
    module: dns_opstrace_mx
  modules: # optional, blackbox module configuration to overwrite exporter defaults
    http_2xx:
      prober: http
      timeout: 5s
      http:
        preferred_ip_protocol: "ip4"
    dns_opstrace_mx:
      prober: dns
      timeout: 5s
      dns:
        preferred_ip_protocol: "ip4"
        transport_protocol: tcp
        dns_over_tls: true
        query_name: opstrace.com
        query_type: MX
' | curl -v -H "Authorization: Bearer $(cat tenant-api-token-dev)" --data-binary @- https://me.opstrace.io/api/v1/exporters/
```

In this example we configure a new `blackbox` exporter named `example-blackbox-exporter`.
The configuration lists two `modules`, one named `http_2xx` for querying HTTP endpoints, and another named `dns_opstrace_mx` for querying against the `MX` email DNS record for `opstrace.com`.
Separately there are four `probes` listing queries to be executed against the `modules`.

Given this configuration, `exporter-blackbox-exporter` will perform the following status checks over time:
- `prometheus.io` and `example.com`: Query the sites over HTTP and emit metrics for the result.
- `1.1.1.1` and `8.8.8.8`: Query the DNS servers for the `opstrace.com` `MX` DNS record and emit metrics for the result.

After the exporter has been deployed, we can retrieve the configuration as follows:

```bash
curl -v -H "Authorization: Bearer $(cat tenant-api-token-dev)" https://me.opstrace.io/api/v1/exporters/example-blackbox-exporter
<exporter config>
```

We can also delete the configuration and destroy the exporter instance as follows:

```bash
curl -v -H "Authorization: Bearer $(cat tenant-api-token-dev)" -XDELETE https://me.opstrace.io/api/v1/exporters/example-blackbox-exporter
```
