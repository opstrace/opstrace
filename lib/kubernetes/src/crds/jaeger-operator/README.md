# jaeger-operator CRDs

To update the jaeger-operator CRDs:

1. Get prerequisites:

    ```bash
    GO111MODULE=on go get github.com/mikefarah/yq/v4
    ```

1. Fetch the latest CRD manifest (edit `Makefile` with desired `operator_version`)

    ```bash
    make fetch-latest-crd
    ```

1. Convert to json

    ```bash
    make crd-to-json
    ```

1. Go to Opstrace repo and regenerate things:

    ```bash
    cd ../opstrace/lib/kubernetes
    yarn generate-apis # updates lib/kubernetes/src/custom-resources
    ```
