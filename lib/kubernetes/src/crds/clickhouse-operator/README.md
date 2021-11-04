# clickhouse-operator CRDs

To update the clickhouse-operator CRDs:

1. Get prerequisites

    ```bash
    GO111MODULE=on go get github.com/mikefarah/yq/v4
    ```

1. Edit the operator version in update.sh

    ```bash
    nano -w update.sh # edit OPERATOR_VERSION
    ```

1. Delete the cached YAML copy

    ```bash
    rm -fv clickhouse-operator-install-bundle_crds.yaml
    ```

1. Fetch CRDs and convert to json

    ```bash
    ./update.sh
    ```

1. Go to Opstrace repo and regenerate things:

    ```bash
    cd ../opstrace/lib/kubernetes
    yarn generate-apis # updates lib/kubernetes/src/custom-resources
    ```
