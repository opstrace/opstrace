#!/bin/bash

set -eou pipefail

# Import helper functions.
source ci/utils.sh

echo "--- upgrading cluster"
./to/opstrace upgrade ${OPSTRACE_CLOUD_PROVIDER} ${OPSTRACE_CLUSTER_NAME} \
    --region=${AWS_CLI_REGION} \
    --cluster-config=ci/cd/cluster-config.yaml \
    --log-level=debug \
    --yes

echo "--- configuring kubectl"
configure_kubectl_aws_or_gcp
