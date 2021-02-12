# Copyright 2019-2021 Opstrace, Inc.
# 
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
# 
#     http://www.apache.org/licenses/LICENSE-2.0
# 
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

#!/usr/bin/env bash

# Import helper functions.
source ci/utils.sh

set -o errexit
set -o errtrace
set -o nounset
set -o pipefail

# Context: this is running in the container started from the image defined via
# opstrace-ci.Dockerfile. The build directory (within TMPDIR on host) is
# mounted at /build, and that should also be the current working directory. In
# addition to /build being the CWD and /build _also_ happening to be within
# /tmp on the host, the /tmp directory on the container can be assumed to be
# /tmp on the host -- shared across potentially simultaneously running builds.

echo "+++ deploy-testremote-teardown.sh start"

echo "running $(basename $0)"
echo "current working directory: $(pwd)"

# When running into permission errors the following is useful debug output.
#cat /.dockerenv || "No /.dockerenv file :-)"
#stat /var/run/docker.sock
#id -un
#id

# From https://docs.aws.amazon.com/cli/latest/topic/config-vars.html:
# "Credentials from environment variables have precedence over credentials from
# the shared credentials and AWS CLI config file. Credentials specified in the
# shared credentials file have precedence over credentials in the AWS CLI
# config file." From here on, make it so that the `aws` cli uses not the
# buildkite service account credentials, but the creds below. Also see
# opstrace-prelaunch/issues/1020.
# Note that this exposes these environment variables to much more processes
# than needed (a potential confusion concern more, not so much a security
# concern).
# Note: sourcing this file exports AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
source secrets/aws-dev-svc-acc-env.sh

# Set GCP service account credentials (also used for opstrace create gcp ...)

#export GOOGLE_APPLICATION_CREDENTIALS=./secrets/gcp-credentials.json
#export OPSTRACE_GCP_PROJECT_ID="vast-pad-240918"

# Shard across GCP CI projects. `shuf` from coreutils: "shuf shuffles its input
# by outputting a random permutation of its input lines. Each output
# permutation is equally likely". Also see
# https://github.com/opstrace/opstrace/pull/128#issuecomment-742519078 and
# https://stackoverflow.com/q/5189913/145400.
#OPSTRACE_GCP_PROJECT_ID=$(shuf -n1 -e ci-shard-aaa ci-shard-bbb ci-shard-ccc)
OPSTRACE_GCP_PROJECT_ID=$(shuf -n1 -e ci-shard-ddd ci-shard-eee ci-shard-fff)
echo "--- random choice for GCP project ID: ${OPSTRACE_GCP_PROJECT_ID}"
export GOOGLE_APPLICATION_CREDENTIALS=./secrets/gcp-svc-acc-${OPSTRACE_GCP_PROJECT_ID}.json

AWS_CLI_REGION="us-west-2"
GCLOUD_CLI_ZONE="us-west2-a"

# `opstrace create ...` is going to write to this.
KUBECONFIG_FILEPATH="kubeconfig_${OPSTRACE_CLUSTER_NAME}"

echo "--- cloud auth activate-service-account: ${GOOGLE_APPLICATION_CREDENTIALS}"
# Log in to GCP with service account credentials. Note(JP): the authentication
# state is I think stored in a well-known location in the home dir.
gcloud auth activate-service-account \
    --key-file=${GOOGLE_APPLICATION_CREDENTIALS} \
    --project ${OPSTRACE_GCP_PROJECT_ID}


start_data_collection_deployment_loop() {
    # Run this as a child process in the background. Rely on it to
    # terminate by itself.
    bash ci/data-collection-deployment-loop.sh "$KUBECONFIG_FILEPATH" &
}

teardown() {
    # Store exit code of the last failed command (could be of `test-remote` or
    # anything before that), or 0 if everything before teardown succeeded.
    LAST_EXITCODE_BEFORE_TEARDOWN=$?

    echo "+++ Exit status before entering teardown(): $LAST_EXITCODE_BEFORE_TEARDOWN"

    echo "--- initiate teardown"

    # Revoke script-global errexit option.
    set +e

    # make sure that looker-related artifacts are collected, but don't fail
    # when these files do not exist (rely on +e before)
    cat /build/looker*report.json
    cp looker*log /build/bk-artifacts
    cp /build/looker*report.json /build/bk-artifacts

    # When cluster creation failed then maybe the k8s cluster was set up
    # correctly, but the deployment phase failed. In that case the command
    # `opstrace create` below fails, beaming us to right here, w/o kubectl
    # having been configured against said k8s cluster (that happens when make
    # install-gcp succeeds). Here, perform a best effort: try to connect
    # kubectl to the k8s cluster, ignoring errors (rely on +e before). Also see
    # opstrace-prelaunch/issues/865
    configure_kubectl_aws_or_gcp

    echo "--- create cluster artifacts"
    # pragmatic way for collecting controller logs and other artifacts as part
    # of teardown. do not fail teardown when a command in this script fails
    # (rely on +e before).
    source ci/create-cluster-artifacts.sh

    echo "--- destroy cluster"
    if [[ "${OPSTRACE_CLOUD_PROVIDER}" == "aws" ]]; then
        ./build/bin/opstrace destroy aws ${OPSTRACE_CLUSTER_NAME} --log-level=debug --yes
        EXITCODE_DESTROY=$?
    else
        ./build/bin/opstrace destroy gcp ${OPSTRACE_CLUSTER_NAME} --log-level=debug --yes
        EXITCODE_DESTROY=$?
    fi

    echo "+++ Exit status of destroy: $EXITCODE_DESTROY"

    # Copy CLI log files "again" to artifact collection dir (for `destroy` log).
    # do not exit when this fails (rely on +e before).
    cp -n opstrace_cli_*log /build/bk-artifacts

    # See opstrace-prelaunch/issues/323
    # and opstrace-prelaunch/issues/1077
    # do not exit when this fails (rely on +e before).
    echo "--- invoke bucket deletion"
    if [[ "${OPSTRACE_CLOUD_PROVIDER}" == "aws" ]]; then
        bash ci/delete-empty-ci-buckets-aws.sh
    else
        bash ci/delete-empty-ci-buckets.sh
    fi
    echo "* exit code of delete-empty-ci-buckets-*.sh: $?"

    if [ "${EXITCODE_DESTROY}" -ne 0 ]; then
        echo "teardown() not yet finished, destroy failed. Exit with exitcode of destroy"
        exit "${EXITCODE_DESTROY}"
    fi

    # Exit this program with the exit code of `test-remote`.
    echo "* teardown() finished. Exit with last exitcode before entering teardown(): $LAST_EXITCODE_BEFORE_TEARDOWN"

    # echo "the N largest files and directories in pwd"
    # pwd
    # du -ha . | sort -r -h | head -n 100 || true

    exit $LAST_EXITCODE_BEFORE_TEARDOWN
}
trap "teardown" EXIT

set -o xtrace

# For debugging potential issues. `gcloud` is a moving target in our CI and
# if something fails around the gcloud CLI it's good to know exactly which
# version we ran.
gcloud --version

mkdir -p "${OPSTRACE_BUILD_DIR}/bk-artifacts"

echo "--- file system usage after entering CI container"
df -h

echo "--- set up dns-service credentials"
curl --request POST \
    --url https://opstrace-dev.us.auth0.com/oauth/token \
    --header 'content-type: application/json' \
    --data-binary "@secrets/dns-service-login-for-ci.json" \
    | jq -jr .access_token > access.jwt


# CI_DATA_COLLECTION is an env var set in the Buildkite pipeline -- when set to
# "enabled", we want to send logs and metrics from the to-be-tested Opstrace
# cluster in this CI run to an aggregation Opstrace cluster. Run this function
# in the background. Do not apply further timeout / job control.
if [[ "${CI_DATA_COLLECTION}" == "enabled" ]]; then
    echo "--- setup: start_data_collection_deployment_loop"
    start_data_collection_deployment_loop &
    # Take a quick, short break before generating more log output, so that
    # the output from the first loop iteration goes into the "proper" section
    # in the build log.
    sleep 5
fi


# Run opstrace installer locally. The installer will deploy the controller into
# the cluster and wait until deployments are 'ready'.
echo "--- create cluster "
if [[ "${OPSTRACE_CLOUD_PROVIDER}" == "aws" ]]; then

    cat ci/cluster-config.yaml | ./build/bin/opstrace create aws ${OPSTRACE_CLUSTER_NAME} \
        --log-level=debug --yes \
        --write-kubeconfig-file "${KUBECONFIG_FILEPATH}"

    # Context: issue opstrace-prelaunch/issues/1905.
    # Copy outfile to prebuild/preamble dir. Required by
    # `make cli-publish-to-s3`.
    FNAME="cli-aws-mutating-api-calls-${CHECKOUT_VERSION_STRING}.txt" && \
        bash ci/gen-cli-aws-mutating-api-calls-list.sh "${FNAME}" && \
        cp "${FNAME}" /build/bk-artifacts && \
        cp "${FNAME}" ${OPSTRACE_PREBUILD_DIR}
else
    cat ci/cluster-config.yaml | ./build/bin/opstrace create gcp ${OPSTRACE_CLUSTER_NAME} \
        --log-level=debug --yes \
        --write-kubeconfig-file "${KUBECONFIG_FILEPATH}"
fi

echo "--- connect kubectl to the CI cluster"
configure_kubectl_aws_or_gcp

# Makefile logic uses `OPSTRACE_KUBE_CONFIG_HOST` to mount kubectl config into
# the test-remote container.
export OPSTRACE_KUBE_CONFIG_HOST="${OPSTRACE_BUILD_DIR}/.kube"

# TODO: remove when we add cloud provider managed certificates and remove the
# use of insecure_skip_verify in the tests
echo "--- checking cluster is using certificate issued by LetsEncrypt"

retry_check_certificate loki.system.${OPSTRACE_CLUSTER_NAME}.opstrace.io:443
retry_check_certificate cortex.system.${OPSTRACE_CLUSTER_NAME}.opstrace.io:443
retry_check_certificate system.${OPSTRACE_CLUSTER_NAME}.opstrace.io:443

echo "--- check if deployed docker images match docker-images.json"
#
# The Buildkite pipeline before starting a step runs a git checkout. The
# preamble step that sets up docker-images.json runs before the step that call
# this script. Reconfigure docker-images.json in order to check if the correct
# docker image tags were deployed.
#
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
${DIR}/build-docker-images-update-controller-config.sh

source ci/check-deployed-docker-images.sh

echo "+++ run test-remote"

# `test-remote` needs these two env vars
export TENANT_DEFAULT_API_TOKEN_FILEPATH="${OPSTRACE_BUILD_DIR}/tenant-api-token-default"
export TENANT_SYSTEM_API_TOKEN_FILEPATH="${OPSTRACE_BUILD_DIR}/tenant-api-token-system"

set +e
make test-remote
EXITCODE_MAKE_TESTREMOTE=$?
set -e
echo "--- Exit status of make test-remote: ${EXITCODE_MAKE_TESTREMOTE}"

set +e
make test-remote-ui
EXITCODE_MAKE_TESTREMOTE_UI=$?
set -e
echo "--- Exit status of make test-remote-ui: ${EXITCODE_MAKE_TESTREMOTE_UI}"

# Rely on screenshots to be created with a certain file name prefix.
cp uishot-*.png /build/bk-artifacts || true

echo "--- run looker tests"
source ci/invoke-looker.sh

echo "--- run opstrace CLI tests (cli-tests-with-cluster.sh)"
source ci/test-cli/cli-tests-with-cluster.sh

# Delayed exit if `make test-remote` failed
if [ "${EXITCODE_MAKE_TESTREMOTE}" -ne 0 ]; then
    echo "make test-remote did exit with code ${EXITCODE_MAKE_TESTREMOTE}. Exit now."
    exit "${EXITCODE_MAKE_TESTREMOTE}"
fi

# Delayed exit if `make test-remote-ui` failed
if [ "${EXITCODE_MAKE_TESTREMOTE_UI}" -ne 0 ]; then
    echo "make test-remote-ui did exit with code ${EXITCODE_MAKE_TESTREMOTE_UI}. Exit now."
    exit "${EXITCODE_MAKE_TESTREMOTE_UI}"
fi

# One child process was spawned (see start_data_collection_deployment_loop()).
# Be a good citizen and join that explicitly (expect that to have terminated by
# now, long ago).
wait
