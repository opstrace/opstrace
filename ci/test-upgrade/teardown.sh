#!/bin/bash

set -eou pipefail

case ${OPSTRACE_CLOUD_PROVIDER} in
    aws)
        REGION=${AWS_CLI_REGION}
        ;;
    gcp)
        REGION=${GCLOUD_CLI_REGION}
        ;;
esac

echo "--- tearing down cluster"
./to/opstrace destroy ${OPSTRACE_CLOUD_PROVIDER} ${OPSTRACE_CLUSTER_NAME} \
    --region=${REGION} \
    --log-level=debug\
    --yes
