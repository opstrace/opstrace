#!/bin/bash

set -eou pipefail

make fetch-secrets

make testupgrade-fetch-cli-artifacts

echo "--- setting up dns-service credentials"
# The `access.jwt` file is what the CLI is going to look for.
cp secrets/dns-service-magic-id-token-for-ci access.jwt

# Write this during `opstrace create ...`
export OPSTRACE_CLI_WRITE_KUBECFG_FILEPATH="${OPSTRACE_BUILD_DIR}/kubeconfig.cfg"

case "${OPSTRACE_CLOUD_PROVIDER}" in
    aws)
        # Note: sourcing this file exports AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
        source secrets/aws-dev-svc-acc-env.sh
        ;;
    gcp)
        # Shard across GCP CI projects.
        #export OPSTRACE_GCP_PROJECT_ID=$(shuf -n1 -e ci-shard-aaa ci-shard-bbb ci-shard-ccc)
        # see issue 293
        export OPSTRACE_GCP_PROJECT_ID=$(shuf -n1 -e ci-shard-aaa ci-shard-bbb ci-shard-ccc)
        echo "--- random choice for GCP project ID: ${OPSTRACE_GCP_PROJECT_ID}"
        export GOOGLE_APPLICATION_CREDENTIALS=./secrets/gcp-svc-acc-${OPSTRACE_GCP_PROJECT_ID}.json
        ;;
esac


start_data_collection_deployment_loop() {
    # Run this as a child process in the background. Rely on it to
    # terminate by itself.
    bash ci/data-collection-deployment-loop.sh "$OPSTRACE_CLI_WRITE_KUBECFG_FILEPATH" &
}

teardown() {
    LAST_EXIT_CODE=$?

    make testupgrade-create-cluster-artifacts
    make testupgrade-teardown && exit ${LAST_EXIT_CODE}
}
trap "teardown" EXIT

# Makefile logic uses `OPSTRACE_KUBECFG_FILEPATH_ONHOST` to mount kubectl
# config into the test-remote container. This path is set on create-cluster.sh.
export OPSTRACE_KUBECFG_FILEPATH_ONHOST="${OPSTRACE_BUILD_DIR}/kubeconfig.cfg"


# For debugging potential issues. `gcloud` is a moving target in our CI and
# if something fails around the gcloud CLI it's good to know exactly which
# version we ran.
gcloud --version

mkdir -p "${OPSTRACE_BUILD_DIR}/bk-artifacts"

if [[ "${CI_DATA_COLLECTION}" == "enabled" ]]; then
    echo "--- setup: start_data_collection_deployment_loop"
    start_data_collection_deployment_loop &
    # Take a quick, short break before generating more log output, so that
    # the output from the first loop iteration goes into the "proper" section
    # in the build log.
    sleep 5
fi


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

# One child process was spawned (see start_data_collection_deployment_loop()).
# Be a good citizen and join that explicitly (expect that to have terminated by
# now, long ago).
wait
