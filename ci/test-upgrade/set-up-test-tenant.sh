#!/bin/bash

RNDSTRING=$( tr -dc a-z < /dev/urandom | head -c 6 || true)
export TENANT_RND_NAME_FOR_TESTING_ADD_TENANT="testtenant${RNDSTRING}"

function run_in_docker() {
	docker run -ti \
		-v $(pwd):/build:rw \
	    -v ${HOME}/.aws:/awsconfig:ro \
	    -v /etc/passwd:/etc/passwd \
	    -e AWS_SHARED_CREDENTIALS_FILE=/awsconfig/credentials \
	    -e AWS_CLI_REGION \
	    -e GCLOUD_CLI_REGION \
	    -e GCLOUD_CLI_ZONE \
	    -e GOOGLE_APPLICATION_CREDENTIALS \
	    -e OPSTRACE_GCP_PROJECT_ID \
	    -e AWS_ACCESS_KEY_ID \
	    -e AWS_SECRET_ACCESS_KEY \
	    -e HOME=/build \
	    -e OPSTRACE_CLUSTER_NAME \
	    -e OPSTRACE_CLOUD_PROVIDER \
	    -e BUILDKITE_BUILD_NUMBER \
	    -e BUILDKITE_PULL_REQUEST \
	    -e BUILDKITE_COMMIT \
	    -e BUILDKITE_BRANCH \
	    -e CHECKOUT_VERSION_STRING \
        -w /build \
	    --dns $(ci/dns_cache.sh) \
	    opstrace/opstrace-ci:${CHECKOUT_VERSION_STRING} \
        $*
}

echo "--- running ta-create-keypair"
run_in_docker /build/to/opstrace ta-create-keypair ./ta-custom-keypair.pem

echo "--- running ta-create-token"
run_in_docker /build/to/opstrace ta-create-token "${OPSTRACE_CLUSTER_NAME}" \
    "${TENANT_RND_NAME_FOR_TESTING_ADD_TENANT}" ta-custom-keypair.pem > tenant-rnd-auth-token-from-custom-keypair

echo "--- running ta-create-token"
run_in_docker /build/to/opstrace ta-pubkeys-add \
    "${OPSTRACE_CLOUD_PROVIDER}" "${OPSTRACE_CLUSTER_NAME}" ta-custom-keypair.pem

export TENANT_RND_AUTHTOKEN="$(cat tenant-rnd-auth-token-from-custom-keypair)"
