
fetch-latest-crd:
	curl -L --silent https://raw.githubusercontent.com/opstrace/cortex-operator/main/config/crd/bases/cortex.opstrace.io_cortices.yaml -o cortex.opstrace.io_cortices.yaml

# removes '.metadata.creationTimestamp' field due to typing issues in typescript
crd-to-json:
	yq -j eval 'del(.metadata.creationTimestamp)' cortex.opstrace.io_cortices.yaml > cortex.opstrace.io_cortices.json

