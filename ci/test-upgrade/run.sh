#!/bin/bash

set -eou pipefail

make rebuild-ci-container-image
make rebuild-testrunner-container-images
make rebuild-looker-container-images

make ci-fetch-secrets

# Override the target kubeconfig directory to point to the checkout directory.
export OPSTRACE_KUBE_CONFIG_HOST=$(pwd)/.kube

# Note: sourcing this file exports AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
source secrets/aws-dev-svc-acc-env.sh

make ci-testupgrade-fetch-cli-artifacts
make ci-testupgrade-dns-service-credentials

teardown() {
    LAST_EXIT_CODE=$?

    make ci-testupgrade-teardown && exit ${LAST_EXIT_CODE}
}
trap "teardown" EXIT



make ci-testupgrade-create-cluster

make test-remote
make test-remote-ui

make ci-testupgrade-upgrade-cluster

make test-remote
make test-remote-ui
