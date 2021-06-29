#!/bin/bash

set -eou pipefail

make ci-fetch-secrets

make ci-testupgrade-fetch-cli-artifacts

echo "--- setting up dns-service credentials"
# The `access.jwt` file is what the CLI is going to look for.
cp secrets/dns-service-magic-id-token-for-ci access.jwt

case "${OPSTRACE_CLOUD_PROVIDER}" in
    aws)
        # Note: sourcing this file exports AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
        source secrets/aws-dev-svc-acc-env.sh
        ;;
    gcp)
        # Shard across GCP CI projects.
        #export OPSTRACE_GCP_PROJECT_ID=$(shuf -n1 -e ci-shard-aaa ci-shard-bbb ci-shard-ccc)
        export OPSTRACE_GCP_PROJECT_ID=$(shuf -n1 -e ci-shard-ddd ci-shard-eee ci-shard-fff)
        echo "--- random choice for GCP project ID: ${OPSTRACE_GCP_PROJECT_ID}"
        export GOOGLE_APPLICATION_CREDENTIALS=./secrets/gcp-svc-acc-${OPSTRACE_GCP_PROJECT_ID}.json
        ;;
esac

# Override the target kubeconfig directory to point to the checkout directory.
export OPSTRACE_KUBE_CONFIG_HOST=$(pwd)/.kube

teardown() {
    LAST_EXIT_CODE=$?

    make ci-testupgrade-teardown && exit ${LAST_EXIT_CODE}
}
trap "teardown" EXIT


make ci-testupgrade-create-cluster

# TODO(sreis): Add a new sanity check on the base cluster here before running
# the upgrade. https://github.com/opstrace/opstrace/issues/591

make ci-testupgrade-upgrade-cluster

make test-browser
make test-remote
make test-remote-looker
make test-remote-ui
