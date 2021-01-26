#!/bin/bash

set -eou pipefail

make rebuild-ci-container-image
make rebuild-testrunner-container-images
make rebuild-looker-container-images

make ci-fetch-secrets

teardown() {
    LAST_EXIT_CODE=$?

    make ci-testupgrade-teardown && exit ${LAST_EXIT_CODE}
}
trap "teardown" EXIT

# Override the target kubeconfig directory to point to the checkout directory.
export OPSTRACE_KUBE_CONFIG_HOST=$(pwd)/.kube

make ci-testupgrade-fetch-cli-artifacts
make ci-testupgrade-dns-service-credentials
make ci-testupgrade-create-cluster
make test-remote || true
make ci-testupgrade-upgrade-cluster
make test-remote || true
