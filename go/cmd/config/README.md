# HTTP Config API service

Serves HTTP interfaces for the following operations:
1. Serving Hasura Actions for getting and setting Alertmanager configurations in cortex
2. Serving Hasura Actions for validating credentials and exporters so that the UI can check validity before sending them to Hasura directly
3. Reading/updating/creating/deleting Credentials and Exporters via Hasura from an HTTP client like curl

The Hasura Actions support is on a separate port from the "main" config API port. This ensures that Hasura Actions support is kept private while the config API is exposed to the internet via an Ingress.

## Test environment

Terminal A:
```
opstrace/packages/app$ yarn services:start
```

Terminal B:
```
opstrace/packages/app$ yarn console
```

Terminal C:
```
opstrace/go/cmd/config$ go build && \
GRAPHQL_ENDPOINT=http://127.0.0.1:8080/v1/graphql \
HASURA_GRAPHQL_ADMIN_SECRET=myadminsecret \
HASURA_ACTION_SECRET=myactionsecret \
./config \
  --loglevel debug \
  --config "127.0.0.1:8989" \
  --action "127.0.0.1:8990" \
  --disable-api-authn
```

The `config` and `action` arguments are for two different ports:
- The `config` port is meant to be visible to the public internet via an Ingress and is meant for users to directly apply configuration to the system. This port requires authentication via bearer token. The config service extracts the tenant name from the signed bearer token.
- The `action` port is for direct access by Hasura via Hasura Actions. This port is not exposed to the internet and is only meant for direct queries from the `graphql` Hasura pod. This port also requires authentication via a random token in an `X-Action-Secret` header. This secret token is shared between the `graphql` pod and the `config-api` pod.

## Alertmanager configs

The config-api service supports fetching and setting the alertmanager configuration for a given tenant. This support is implemented in two places:
- The `action` port implements Hasura Actions named `getAlertmanager` and `updateAlertmanager`. These are ultimately for the UI to display configuration for setting and getting the per-tenant alertmanager configurations. The UI queries Hasura, which then routes the queries to the config-api service via Hasura Actions.
- The public `config` port meanwhile implements HTTP passthrough endpoints that forward directly to Cortex. The config-api service extracts the tenant name from the signed bearer token, then provides the tenant name to Cortex via a `X-Scope-OrgID` header.

In both cases, the config-api service is acting as a frontend to Cortex, which internally stores the alertmanager and ruler configs in a configured S3 or GCS bucket.

### Alertmanager Hasura Actions: getAlertmanager/updateAlertmanager

These actions allow the UI to retrieve and store Alertmanager configurations in Cortex by just talking to Hasura, rather than needing to talk to Cortex directly.

Here is an example GraphQL flow communicating with Hasura, which then routes the queries to the config service:

#### Alertmanager GraphQL examples

Getting config that doesn't exist yet
```
query MyQuery {
  getAlertmanager(tenant_id: "dev") {
    config
    online
    tenant_id
  }
}

{
  "data": {
    "getAlertmanager": {
      "config": "",
      "online": true,
      "tenant_id": "dev"
    }
  }
}
```

Setting invalid config
```
mutation MyMutation {
  updateAlertmanager(tenant_id: "dev", input: {config: "this is very yaml"}) {
    error_message
    error_raw_response
    success
    error_type
  }
}

{
  "data": {
    "updateAlertmanager": {
      "error_message": "Alertmanager config validation failed",
      "error_raw_response": "error marshalling YAML Alertmanager config: yaml: unmarshal errors:\n  line 1: cannot unmarshal !!str `this is...` into alertmanager.UserConfig\n",
      "success": false,
      "error_type": "VALIDATION_FAILED"
    }
  }
}
```

Setting valid config
```
mutation MyMutation {
  updateAlertmanager(tenant_id: "dev", input: {config: "alertmanager_config: |\n  global:\n    smtp_smarthost: 'localhost:25'\n    smtp_from: 'youraddress@example.org'\n  route:\n    receiver: example-email\n  receivers:\n    - name: example-email\n      email_configs:\n      - to: 'youraddress@example.org'\n"}) {
    error_message
    error_raw_response
    success
    error_type
  }
}

{
  "data": {
    "updateAlertmanager": {
      "error_message": null,
      "error_raw_response": null,
      "success": true,
      "error_type": null
    }
  }
}
```

Getting config that was just set (note: isn't exact string match, cortex seems to insert blank `template_files` at root)
```
query MyQuery {
  getAlertmanager(tenant_id: "dev") {
    config
    online
    tenant_id
  }
}

{
  "data": {
    "getAlertmanager": {
      "config": "template_files: {}\nalertmanager_config: |\n  global:\n    smtp_smarthost: 'localhost:25'\n    smtp_from: 'youraddress@example.org'\n  route:\n    receiver: example-email\n  receivers:\n    - name: example-email\n      email_configs:\n      - to: 'youraddress@example.org'\n",
      "online": true,
      "tenant_id": "dev"
    }
  }
}
```

### Alertmanager HTTP endpoints

The `config-api` service directly exposes `/api/v1/alerts`, `/api/v1/alertmanager` and `/api/v1/multitenant_alertmanager` endpoints, which pass-through to the equivalent Cortex endpoints. Requests must include the bearer token. The tenant name is extracted from the signed bearer token in the request, and provided to Cortex via an `X-Scope-OrgID` header. The most useful endpoint is `/api/v1/alerts`, which allows setting the alertmanager config. The others are mainly for providing system status.

#### Alertmanager HTTP examples

Setting config via `/api/v1/alerts` using `dev` token file. See [Cortex API reference](https://cortexmetrics.io/docs/api/#set-alertmanager-configuration).
```
$ cat valid-test.yaml
alertmanager_config: |
  route:
    receiver: 'default-receiver'
    group_wait: 30s
    group_interval: 5m
    repeat_interval: 4h
    group_by: [cluster, alertname]
  receivers:
    - name: default-receiver

$ curl -k -H "Authorization: Bearer $(cat tenant-api-token-dev)" --data-binary @valid-test.yaml https://MYCLUSTER.opstrace.io/api/v1/alerts
```

Fetching config via `/api/v1/alerts` using `dev` token file. See [Cortex API reference](https://cortexmetrics.io/docs/api/#get-alertmanager-configuration).
```
$ curl -k -H "Authorization: Bearer $(cat tenant-api-token-dev)" https://MYCLUSTER.opstrace.io/api/v1/alerts
template_files: {}
alertmanager_config: |
  route:
    receiver: 'default-receiver'
    group_wait: 30s
    group_interval: 5m
    repeat_interval: 4h
    group_by: [cluster, alertname]
  receivers:
    - name: default-receiver
```

## Alert rules

The `config-api` service directly exposes `/api/v1/rules` and `/api/v1/ruler` endpoints, which pass-through to the equivalent Cortex endpoints. Unlike with the Alertmanager configs which can be controlled either via GraphQL/Hasura Actions or via HTTP, alert rules are only accessible via these HTTP passthrough endpoints. The endpoints forward directly to Cortex, with the tenant name extracted from the signed bearer token in the request, and provided to Cortex via an `X-Scope-OrgID` header. The most useful endpoints are under `/api/v1/rules`, which allows configuring alerting rules. Meanwhile `/api/v1/ruler` is mainly for providing system status.

#### Alert rules HTTP examples

Setting an alert rule group named `bar` under namespace `foo` via `/api/v1/rules/foo`. See [Cortex API reference](https://cortexmetrics.io/docs/api/#set-rule-group) for this and other available calls under `/api/v1/rules`.
```
echo '
name: bar
rules:
- alert: DeadMansSwitch
  annotations:
      description: "This is a DeadMansSwitch meant to ensure that the entire Alerting pipeline is functional. See https://deadmanssnitch.com/snitches/e759300835/"
      summary: "Alerting DeadMansSwitch"
  expr: vector(1)
  labels:
      severity: warning

- alert: InstanceDown
  expr: up == 0
  for: 7m
  labels:
      severity: warning
  annotations:
      summary: "Instance {{ $labels.instance }} down"
      description: "{{ $labels.instance }} of job {{ $labels.job }} has been down for more than 7 minutes."
' | curl -v -k -H "Authorization: Bearer $(cat tenant-api-token-dev)" -H "Content-Type: application/yaml" --data-binary @- https://MYCLUSTER.opstrace.io/api/v1/rules/foo
```

## Cloud credentials and Exporter configs

Cloud credentials and exporter configs are stored directly in Hasura/Postgres. The `config-api` service provides HTTP endpoints for users to configure their credentials and exporters, while also providing Hasura endpoints for validating them.

### Integration Hasura Actions: validateIntegration

These actions allow the UI to execute the validation code implemented in the Go service. This is effectively "honor system" and just avoids the UI needing to reimplement validation in the UI directly. Once validation has passed, the UI can then update the validated Integration in question via Hasura directly.

The HTTP endpoints described in the next section perform the same validation internally, and will reject `POST` submissions that do not pass validation.

### Credential and Exporter HTTP endpoints

This interface allows a customer to manually update objects in Hasura using curl or another HTTP client. Meanwhile the UI talks to Hasura directly.

```
[HTTP clients] -http-> [config-api service] -graphql-> [Hasura/GraphQL] -postgres-> [PostgreSQL]
```

In normal use, the config service extracts the tenant name from the bearer token that must be provided with requests. When instead testing with `--disable-api-authn`, the service requires that we provide the tenant name using an `X-Scope-OrgID` header, as provided in the examples below.

#### Credential HTTP examples

Upsert (will fail if types are unsupported or invalid format)
```
echo '
name: foo
type: aws-key
# aws-key must contain these two fields:
value:
  AWS_ACCESS_KEY_ID: foo
  AWS_SECRET_ACCESS_KEY: bar
---
name: bar
type: azure-service-principal
# azure-service-principal must contain these four fields:
value:
  AZURE_SUBSCRIPTION_ID: my-subscription-uuid
  AZURE_TENANT_ID: my-directory-uuid
  AZURE_CLIENT_ID: my-application-uuid
  AZURE_CLIENT_SECRET: my-app-client-secret
---
name: baz
type: gcp-service-account
# gcp-service-account must contain valid json:
value: |-
  {"json": "goes-here"}
' | curl -v -H "Authorization: Bearer $(cat tenant-api-token-dev)" --data-binary @- https://MYCLUSTER.opstrace.io/api/v1/credentials/
```

Get all
```
curl -v -H "Authorization: Bearer $(cat tenant-api-token-dev)" https://MYCLUSTER.opstrace.io/api/v1/credentials/
```

Get foo
```
curl -v -H "Authorization: Bearer $(cat tenant-api-token-dev)" https://MYCLUSTER.opstrace.io/api/v1/credentials/foo
```

Delete foo
```
curl -v -H "Authorization: Bearer $(cat tenant-api-token-dev)" -XDELETE https://MYCLUSTER.opstrace.io/api/v1/credentials/foo
```

#### Exporter HTTP examples

Upsert (will fail if referenced `credential`s aren't present or are incompatible types)
```
echo '
name: foo
type: cloudwatch
credential: foo
# nested yaml configuration defined by cloudwatch exporter:
config:
  region: us-west-2
  metrics:
  - aws_namespace: Buildkite
    aws_metric_name: ScheduledJobsCount
    aws_dimensions: [Org, Queue]
    aws_statistics: [Sum]
  - aws_namespace: Buildkite
    aws_metric_name: RunningJobsCount
    aws_dimensions: [Org, Queue]
    aws_statistics: [Sum]
  - aws_namespace: Buildkite
    aws_metric_name: WaitingJobsCount
    aws_dimensions: [Org, Queue]
    aws_statistics: [Sum]
---
name: bar
type: azure
credential: bar
# nested yaml configuration defined by azure exporter:
config:
  resource_groups:
  - resource_group: MYGROUP
    resource_types: # example obtained via "azure_metrics_exporter --list.namespaces"
    - "Microsoft.Storage/storageAccounts"
    metrics: # example obtained via "azure_metrics_exporter --list.definitions"
    - name: Availability
    - name: Egress
    - name: Ingress
    - name: SuccessE2ELatency
    - name: SuccessServerLatency
    - name: Transactions
    - name: UsedCapacity
---
name: baz
type: stackdriver
credential: baz
# nested yaml fields matching stackdriver exporter flags:
config:
  monitoring.metrics-type-prefixes: # required, comma separated list
  - compute.googleapis.com/instance/cpu
  - compute.googleapis.com/instance/disk
  google.project-id: # optional, comma separated list
  - vast-pad-240918
  - proj2
  monitoring.metrics-interval: '5m' # optional
  monitoring.metrics-offset: '0s' # optional
---
name: bazz
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
' | curl -v -H "Authorization: Bearer $(cat tenant-api-token-dev)" --data-binary @- https://MYCLUSTER.opstrace.io/api/v1/exporters/
```

Get all
```
curl -v -H "Authorization: Bearer $(cat tenant-api-token-dev)" https://MYCLUSTER.opstrace.io/api/v1/exporters/
```

Get foo
```
curl -v -H "Authorization: Bearer $(cat tenant-api-token-dev)" https://MYCLUSTER.opstrace.io/api/v1/exporters/foo
```

Delete foo
```
curl -v -H "Authorization: Bearer $(cat tenant-api-token-dev)" -XDELETE https://MYCLUSTER.opstrace.io/api/v1/exporters/foo
```
