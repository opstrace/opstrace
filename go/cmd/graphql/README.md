# GraphQL HTTP service

Serves HTTP CRUD interfaces for editing credentials and exporters.

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

Terminal C (requires that a tenant named `tenant-foo` be created):
```
opstrace/go/cmd/graphql$ go build && \
GRAPHQL_ENDPOINT=http://127.0.0.1:8080/v1/graphql \
HASURA_GRAPHQL_ADMIN_SECRET=myadminsecret \
./graphql \
  --loglevel debug \
  --listen "127.0.0.1:8989" \
  --tenantname tenant-foo
```

## Example usage

The credential and exporter APIs are nearly identical, but with different payloads.

### Credentials

Upsert
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
' | curl -v -XPOST --data-binary @- http://127.0.0.1:8989/api/v1/credentials/
```

Get all
```
curl -v http://127.0.0.1:8989/api/v1/credentials/
```

Get foo
```
curl -v http://127.0.0.1:8989/api/v1/credentials/foo
```

Delete foo
```
curl -v -XDELETE http://127.0.0.1:8989/api/v1/credentials/foo
```

### Exporters

Upsert (will fail if referenced `credential`s aren't present)
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
' | curl -v -XPOST --data-binary @- http://127.0.0.1:8989/api/v1/exporters/
```

Get all
```
curl -v http://127.0.0.1:8989/api/v1/exporters/
```

Get foo
```
curl -v http://127.0.0.1:8989/api/v1/exporters/foo
```

Delete foo
```
curl -v -XDELETE http://127.0.0.1:8989/api/v1/exporters/foo
```
