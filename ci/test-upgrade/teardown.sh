#!/bin/bash

set -eou pipefail

# Note: sourcing this file exports AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
source secrets/aws-dev-svc-acc-env.sh

echo "--- tearing down cluster"
./to/opstrace destroy ${OPSTRACE_CLOUD_PROVIDER} ${OPSTRACE_CLUSTER_NAME} \
    --log-level=debug\
    --yes
