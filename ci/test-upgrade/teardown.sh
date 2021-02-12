#!/bin/bash

set -eou pipefail

echo "--- tearing down cluster"
./to/opstrace destroy ${OPSTRACE_CLOUD_PROVIDER} ${OPSTRACE_CLUSTER_NAME} \
    --log-level=debug\
    --yes
