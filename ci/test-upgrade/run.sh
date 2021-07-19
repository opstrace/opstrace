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

    make ci-testupgrade-create-cluster-artifacts
    make ci-testupgrade-teardown && exit ${LAST_EXIT_CODE}
}
trap "teardown" EXIT


make ci-testupgrade-create-cluster

# TODO(sreis): Add a new sanity check on the base cluster here before running
# the upgrade. https://github.com/opstrace/opstrace/issues/591

make ci-testupgrade-upgrade-cluster

# Define default for OPSTRACE_INSTANCE_DNS_NAME.
export OPSTRACE_INSTANCE_DNS_NAME="${OPSTRACE_CLUSTER_NAME}.opstrace.io"

# This step is required for the create_tenant_and_use_custom_authn_token in the
# test-remote test suite. This step sets up the tenant keys in the opstrace
# instance and exports the required env vars:
# - TENANT_RND_NAME_FOR_TESTING_ADD_TENANT
# - TENANT_RND_AUTHTOKEN
#
make ci-testupgrade-set-up-test-tenant
export TENANT_RND_NAME_FOR_TESTING_ADD_TENANT=$(cat tenant-rnd-name)
export TENANT_RND_AUTHTOKEN=$(cat tenant-rnd-auth-token-from-custom-keypair)

#
# TODO(sreis): remove this step when the OPSTRACE_CLI_VERSION_FROM is bumped
#
make ci-testupgrade-wait-for-loki-ring

make test-remote
make test-remote-ui
make test-browser

export OPSTRACE_BUILD_DIR=$(pwd)
source ci/invoke-looker.sh
