#!/bin/bash

set -eou pipefail

make fetch-secrets

make testupgrade-fetch-cli-artifacts

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
        # see issue 293
        export OPSTRACE_GCP_PROJECT_ID=$(shuf -n1 -e ci-shard-aaa ci-shard-bbb ci-shard-ccc ci-shard-eee)
        echo "--- random choice for GCP project ID: ${OPSTRACE_GCP_PROJECT_ID}"
        export GOOGLE_APPLICATION_CREDENTIALS=./secrets/gcp-svc-acc-${OPSTRACE_GCP_PROJECT_ID}.json
        ;;
esac

# Override the target kubeconfig directory to point to the checkout directory.
export OPSTRACE_KUBE_CONFIG_HOST=$(pwd)/.kube

teardown() {
    LAST_EXIT_CODE=$?

    make testupgrade-create-cluster-artifacts
    make testupgrade-teardown && exit ${LAST_EXIT_CODE}
}
trap "teardown" EXIT


make testupgrade-create-cluster

# TODO(sreis): Add a new sanity check on the base cluster here before running
# the upgrade. https://github.com/opstrace/opstrace/issues/591
make testupgrade-upgrade-cluster

# Define default for OPSTRACE_INSTANCE_DNS_NAME.
export OPSTRACE_INSTANCE_DNS_NAME="${OPSTRACE_CLUSTER_NAME}.opstrace.io"


# TODO(sreis): remove this step when the OPSTRACE_CLI_VERSION_FROM is bumped
make testupgrade-wait-for-loki-ring

# Use the 'new CLI' (or this PR) to do interaction with the Opstrace instance
# in test-core.sh
export OPSTRACE_CLI_PATH="./to/opstrace"

# This runs the bulk of the tests against the Opstrace instance, also invoked
# from the upgrade test pipeline and therefore in its own file.
source ci/test-core.sh

