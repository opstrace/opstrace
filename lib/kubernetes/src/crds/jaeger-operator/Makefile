# version to fetch, see https://github.com/jaegertracing/jaeger-operator/releases
operator_version=v1.27.0

fetch-latest-crd:
	curl -OL https://raw.githubusercontent.com/jaegertracing/jaeger-operator/$(operator_version)/deploy/crds/jaegertracing.io_jaegers_crd.yaml

# removes '.metadata.creationTimestamp' field due to typing issues in typescript
crd-to-json:
	yq -o=json eval 'del(.metadata.creationTimestamp)' jaegertracing.io_jaegers_crd.yaml > jaegertracing.io_jaegers.json
