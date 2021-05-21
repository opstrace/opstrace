#!/bin/bash

set -eou pipefail

echo "--- tearing down cluster"
./to/opstrace destroy ${OPSTRACE_CLOUD_PROVIDER} ${OPSTRACE_CLUSTER_NAME} \
    --region=${AWS_CLI_REGION} \
    --log-level=debug\
    --yes
