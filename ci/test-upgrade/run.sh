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

# The tenant API authenticator keypair management capability is confirmed to
# work -- now create a keypair, push the public key into the cluster and
# generate a tenant API authentication token for a tenant that does not
# exist yet in the cluster -- use a random name. Then inject into test-remote:
# - the name of that tenant
# - the path to the authentication token file
set -x
set +e; RNDSTRING=$( tr -dc a-z < /dev/urandom | head -c 6 ); set -e
TENANT_RND_NAME_FOR_TESTING_ADD_TENANT="testtenant${RNDSTRING}"
./to/opstrace ta-create-keypair ./ta-custom-keypair.pem
./to/opstrace ta-create-token "${OPSTRACE_CLUSTER_NAME}" \
    "${TENANT_RND_NAME_FOR_TESTING_ADD_TENANT}" ta-custom-keypair.pem > tenant-rnd-auth-token-from-custom-keypair
TENANT_RND_AUTHTOKEN="$(cat tenant-rnd-auth-token-from-custom-keypair)"
./to/opstrace ta-pubkeys-add \
    "${OPSTRACE_CLOUD_PROVIDER}" "${OPSTRACE_CLUSTER_NAME}" ta-custom-keypair.pem
set -x
export TENANT_RND_AUTHTOKEN
export TENANT_RND_NAME_FOR_TESTING_ADD_TENANT

# Define default for OPSTRACE_INSTANCE_DNS_NAME.
export OPSTRACE_INSTANCE_DNS_NAME="${OPSTRACE_CLUSTER_NAME}.opstrace.io"

make test-remote
make test-remote-looker
make test-remote-ui
make test-browser
