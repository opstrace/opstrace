#!/bin/bash

set -eou pipefail

# Import helper functions.
source ci/utils.sh

# Run opstrace installer locally. The installer will deploy the controller into
# the cluster and wait until deployments are 'ready'.
echo "--- creating cluster"
./from/opstrace create ${OPSTRACE_CLOUD_PROVIDER} ${OPSTRACE_CLUSTER_NAME} \
    --cluster-config ci/cluster-config.yaml \
    --log-level=debug \
    --yes

echo "--- configuring kubectl"
configure_kubectl_aws_or_gcp

echo "--- checking cluster is using certificate issued by LetsEncrypt"
retry_check_certificate loki.system.${OPSTRACE_CLUSTER_NAME}.opstrace.io:443
retry_check_certificate cortex.system.${OPSTRACE_CLUSTER_NAME}.opstrace.io:443
retry_check_certificate system.${OPSTRACE_CLUSTER_NAME}.opstrace.io:443
