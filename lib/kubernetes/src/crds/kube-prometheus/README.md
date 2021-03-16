# Prometheus CRDs

These are CRDs for the Prometheus Operator that will be installed into the cluster by the controller.

To update these CRDs, perform the following:

1. Get prerequisites:
```
git clone git@github.com:prometheus-operator/kube-prometheus
cd kube-prometheus/
go get github.com/google/go-jsonnet/cmd/jsonnet
```

2. Assign prometheus-operator version for source template data:
```
nano -w jsonnet/kube-prometheus/jsonnetfile.json
# replace the 'version-0.XX' value under prometheus-operator with the operator tag e.g. 'v0.46.0'
go get -u github.com/jsonnet-bundler/jsonnet-bundler/cmd/jb
jp update
```

3. Generate manifests as JSON files:
```
rm -rf manifests/
mkdir -p manifests/setup/
# Omit '.metadata.creationTimestamp=null' field due to typing issues in typescript:
jsonnet -J vendor -m manifests "${1-example.jsonnet}" | xargs -I{} sh -c 'cat {} | grep -v "\"creationTimestamp\": null" > {}.json'
```

4. Copy generated JSON files to opstrace repo:
```
cp -v manifests/setup/prometheus-operator-0*.json ../opstrace/lib/kubernetes/src/crds/kube-prometheus/
```

5. Go to opstrace repo and regenerate things:
```
cd ../opstrace/lib/kubernetes
yarn generate-apis # updates lib/kubernetes/src/custom-resources
```
