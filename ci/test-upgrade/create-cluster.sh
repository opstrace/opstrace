#!/bin/bash

set -eou pipefail

# Import helper functions.
source ci/utils.sh

if [[ "${OPSTRACE_CLOUD_PROVIDER}" == "gcp" ]]; then
    echo "--- cloud auth activate-service-account: ${GOOGLE_APPLICATION_CREDENTIALS}"
    # Inside the CI container, log in to GCP with service account credentials.
    gcloud auth activate-service-account \
        --key-file=${GOOGLE_APPLICATION_CREDENTIALS} \
        --project ${OPSTRACE_GCP_PROJECT_ID}
fi

echo "--- creating cluster"
./from/opstrace create ${OPSTRACE_CLOUD_PROVIDER} ${OPSTRACE_CLUSTER_NAME} \
    --instance-config ci/test-upgrade/initial-cluster-config.yaml \
    --log-level=debug \
    --yes

echo "--- configuring kubectl"
configure_kubectl_aws_or_gcp

echo "--- checking cluster is using certificate issued by LetsEncrypt"
retry_check_certificate loki.system.${OPSTRACE_CLUSTER_NAME}.opstrace.io:443
retry_check_certificate cortex.system.${OPSTRACE_CLUSTER_NAME}.opstrace.io:443
retry_check_certificate system.${OPSTRACE_CLUSTER_NAME}.opstrace.io:443
