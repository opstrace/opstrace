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
./config \
  --loglevel debug \
  --config "127.0.0.1:8989" \
  --action "127.0.0.1:8990" \
  --disable-api-authn
```

## Hasura Actions: getAlertmanager/updateAlertmanager

These actions allow the UI to retrieve and store Alertmanager configurations in Cortex by talking to Hasura, rather than needing to talk to Cortex directly.

### Example usage

Here is an example GraphQL flow communicating with Hasura, which then routes the queries to the config service:

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

## Hasura Actions: validateCredential/validateExporter

These actions allow the UI to execute the validation code implemented in the Go service. This is effectively "honor system" and just avoids the UI needing to reimplement validation in the UI directly. Once validation has passed, the UI can then update the Credential or Exporter via Hasura directly.

The HTTP endpoints `/api/v1/credentials` and `/api/v1/exporters` run the same validation internally, and will reject `POST` submissions that do not pass validation.

## HTTP Credentials and Exporters APIs

This interface allows a customer to manually update objects in Hasura using curl or another HTTP client. Meanwhile the UI talks to Hasura directly.

```
[HTTP clients] -http-> [THIS SERVICE] -graphql-> [Hasura/GraphQL] -postgres-> [PostgreSQL]
```

In normal use, the config service extracts the tenant name from the bearer token that must be provided with requests. When instead testing with `--disable-api-authn`, the service requires that we provide the tenant name using an `X-Scope-OrgID` header, as provided in the examples below.

### Example usage

The credential and exporter APIs are nearly identical, but with different payloads.

#### Credentials

Upsert (will fail if types are unsupported or invalid format)
```
echo 'name: foo
type: aws-key
# aws-key must contain these two fields as nested yaml (stored as json in postgres):
value:
  AWS_ACCESS_KEY_ID: foo
  AWS_SECRET_ACCESS_KEY: bar
---
name: bar
type: gcp-service-account
# gcp-service-account must contain valid json:
value: |-
  {"json": "goes-here"}
' | curl -v -H "X-Scope-OrgID: tenant-foo" -XPOST --data-binary @- http://127.0.0.1:8989/api/v1/credentials/
```

Get all
```
curl -v -H "X-Scope-OrgID: tenant-foo" http://127.0.0.1:8989/api/v1/credentials/
```

Get foo
```
curl -v -H "X-Scope-OrgID: tenant-foo" http://127.0.0.1:8989/api/v1/credentials/foo
```

Delete foo
```
curl -v -H "X-Scope-OrgID: tenant-foo" -XDELETE http://127.0.0.1:8989/api/v1/credentials/foo
```

#### Exporters

Upsert (will fail if referenced `credential`s aren't present or are incompatible types)
```
echo 'name: foo
type: cloudwatch
credential: foo
# nested yaml payload defined by cloudwatch exporter:
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
type: stackdriver
credential: bar
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
' | curl -v -H "X-Scope-OrgID: tenant-foo" -XPOST --data-binary @- http://127.0.0.1:8989/api/v1/exporters/
```

Get all
```
curl -v -H "X-Scope-OrgID: tenant-foo" http://127.0.0.1:8989/api/v1/exporters/
```

Get foo
```
curl -v -H "X-Scope-OrgID: tenant-foo" http://127.0.0.1:8989/api/v1/exporters/foo
```

Delete foo
```
curl -v -H "X-Scope-OrgID: tenant-foo" -XDELETE http://127.0.0.1:8989/api/v1/exporters/foo
```
