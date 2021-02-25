# HTTP Config API service

Serves HTTP CRUD interfaces for editing credentials and exporters, possibly other things in the future.

```
[HTTP clients] -http-> [THIS SERVICE] -graphql-> [Hasura/GraphQL] -postgres-> [PostgreSQL]
```

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
  --listen "127.0.0.1:8989" \
  --disable-api-authn
```

In normal use, the config service extracts the tenant name from the bearer token that must be provided with requests. When instead testing with `--disable-api-authn`, the service requires that we provide the tenant name using an `X-Scope-OrgID` header, as provided in the examples below.

## Example usage

The credential and exporter APIs are nearly identical, but with different payloads.

### Credentials

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

### Exporters

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
