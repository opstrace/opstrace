#!/bin/bash

set -eou pipefail

make rebuild-ci-container-image
# testrunner run tsc which requires buildinfo package to be set
make set-build-info-constants
make rebuild-testrunner-container-images
make rebuild-looker-container-images

make ci-fetch-secrets

# Override the target kubeconfig directory to point to the checkout directory.
# Account for cloud provider to allow multiple simultaneous runs of this build.
export OPSTRACE_KUBE_CONFIG_HOST=$(pwd)/${OPSTRACE_CLOUD_PROVIDER}/.kube
export OPSTRACE_KUBECONFIG=$(pwd)/${OPSTRACE_CLOUD_PROVIDER}/.kube/config
mkdir -p $(pwd)/${OPSTRACE_CLOUD_PROVIDER}/.kube/

# Note: sourcing this file exports AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
source secrets/aws-dev-svc-acc-env.sh

if [[ "${OPSTRACE_CLOUD_PROVIDER}" == "gcp" ]]; then
    # Shard across GCP CI projects.
    #export OPSTRACE_GCP_PROJECT_ID=$(shuf -n1 -e ci-shard-aaa ci-shard-bbb ci-shard-ccc)
    export OPSTRACE_GCP_PROJECT_ID=$(shuf -n1 -e ci-shard-ddd ci-shard-eee ci-shard-fff)
    echo "--- random choice for GCP project ID: ${OPSTRACE_GCP_PROJECT_ID}"
    export GOOGLE_APPLICATION_CREDENTIALS=./secrets/gcp-svc-acc-${OPSTRACE_GCP_PROJECT_ID}.json
fi

make ci-testupgrade-fetch-cli-artifacts
make ci-testupgrade-dns-service-credentials

teardown() {
    LAST_EXIT_CODE=$?

    make ci-testupgrade-teardown && exit ${LAST_EXIT_CODE}
}
trap "teardown" EXIT


make ci-testupgrade-create-cluster

# TODO(sreis): Add a new sanity check on the base cluster here before running
# the upgrade. https://github.com/opstrace/opstrace/issues/591

make ci-testupgrade-upgrade-cluster

make test-remote
make test-remote-looker
make test-remote-ui
