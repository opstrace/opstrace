#!/bin/bash

set -eou pipefail

make rebuild-ci-container-image
# testrunner run tsc which requires buildinfo package to be set
make set-build-info-constants
make rebuild-testrunner-container-images
make rebuild-looker-container-image

make ci-cd-fetch-secrets

# Override the target kubeconfig directory to point to the checkout directory.
export OPSTRACE_KUBE_CONFIG_HOST=$(pwd)/.kube

# Note: sourcing this file exports AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
source secrets/aws-dev-svc-acc-env.sh

make ci-cd-fetch-cli-artifacts

echo "--- setting up dns-service credentials"
# The `access.jwt` file is what the CLI is going to look for.
cp secrets/dns-service-magic-id-token-for-ci access.jwt

# Note: sourcing this file exports AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
# cdtest cluster was created in a separate account.
source secrets/aws-loadtest-acc-env.sh

make ci-cd-upgrade-cluster

# TODO(sreis): the system logs test suite (check loki ingester logs, check
# cortex ingester logs, check systemlog Fluentd instance logs) needs to account
# for long running clusters.
make test-browser
make test-remote || true
make test-remote-looker
make test-remote-ui
