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

# Set our dockerhub env vars so that opstrace create will deploy the image pull secret
# therefore authenticating with dockerhub to avoid the aggressive anonymous user rate limits
source secrets/opstrace_dockerhub_creds.sh

# Set GCP service account credentials (also used for opstrace create gcp ...)

#export GOOGLE_APPLICATION_CREDENTIALS=./secrets/gcp-credentials.json
#export OPSTRACE_GCP_PROJECT_ID="vast-pad-240918"

# Shard across GCP CI projects. `shuf` from coreutils: "shuf shuffles its input
# by outputting a random permutation of its input lines. Each output
# permutation is equally likely". Also see
# https://github.com/opstrace/opstrace/pull/128#issuecomment-742519078 and
# https://stackoverflow.com/q/5189913/145400.
#OPSTRACE_GCP_PROJECT_ID=$(shuf -n1 -e ci-shard-aaa ci-shard-bbb ci-shard-ccc)
# remove eee and fff for now, see issue #293
OPSTRACE_GCP_PROJECT_ID=$(shuf -n1 -e ci-shard-aaa ci-shard-bbb ci-shard-ccc ci-shard-eee)
echo "--- random choice for GCP project ID: ${OPSTRACE_GCP_PROJECT_ID}"
export GOOGLE_APPLICATION_CREDENTIALS=./secrets/gcp-svc-acc-${OPSTRACE_GCP_PROJECT_ID}.json


AWS_CLI_REGION="us-west-2"
GCLOUD_CLI_ZONE="us-west2-a"

# `opstrace create ...` is going to write to this.
OPSTRACE_CLI_WRITE_KUBECFG_FILEPATH="kubeconfig_${OPSTRACE_CLUSTER_NAME}"

echo "--- gcloud auth activate-service-account: ${GOOGLE_APPLICATION_CREDENTIALS}"
# Log in to GCP with service account credentials. Note(JP): the authentication
# state is I think stored in a well-known location in the home dir.
gcloud auth activate-service-account \
    --key-file=${GOOGLE_APPLICATION_CREDENTIALS} \
    --project ${OPSTRACE_GCP_PROJECT_ID}


start_data_collection_deployment_loop() {
    # Run this as a child process in the background. Rely on it to
    # terminate by itself.
    bash ci/data-collection-deployment-loop.sh "$OPSTRACE_CLI_WRITE_KUBECFG_FILEPATH" &
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

        # The destroy command searches for the cluster in all the available AWS
        # regions and sometimes it can timeout and fail to cleanup resources
        # properly.
        if [[ "${EXITCODE_DESTROY}" -ne 0 ]]; then
            echo "--- initial destroy failed, retrying..."
            ./build/bin/opstrace destroy aws ${OPSTRACE_CLUSTER_NAME} \
                --region=${AWS_CLI_REGION} \
                --log-level=debug \
                --yes
        fi

    else
        ./build/bin/opstrace destroy gcp ${OPSTRACE_CLUSTER_NAME} --log-level=debug --yes
        EXITCODE_DESTROY=$?

        # The custom_dns_name feature requires 'manual' setup of a DNS zone
        # before Opstrace instance creation, and therefore also manual cleanup.
        source ci/wipe-gcp-dns-subzone.sh

        # First, delete sub zone using the CI shard's GCP credentials
        gcloud_wipe_and_delete_dns_sub_zone "zone-${OPSTRACE_CLUSTER_NAME}"

        # Then temporarily switch credentials and wipe NS records from root DNS
        # zone.
        gcloud auth activate-service-account \
            --key-file="./secrets/gcp-svc-acc-dev-dns-service.json" --project "vast-pad-240918"

        gcloud_remove_ns_records_from_root_opstracegcp "${OPSTRACE_CLUSTER_NAME}.opstracegcp.com"
        # Revert gcloud CLI authentication state to GCP project CI shard.
        gcloud auth activate-service-account \
            --key-file=${GOOGLE_APPLICATION_CREDENTIALS} \
            --project ${OPSTRACE_GCP_PROJECT_ID}
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
    echo "--- teardown() finished. Exit with last exitcode before entering teardown(): $LAST_EXITCODE_BEFORE_TEARDOWN"

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
# The `access.jwt` file is what the CLI is going to look for.
cp secrets/dns-service-magic-id-token-for-ci access.jwt


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

# Define default for OPSTRACE_INSTANCE_DNS_NAME.
export OPSTRACE_INSTANCE_DNS_NAME="${OPSTRACE_CLUSTER_NAME}.opstrace.io"

# Run opstrace installer locally. The installer will deploy the controller into
# the cluster and wait until deployments are 'ready'.
echo "--- create cluster "
if [[ "${OPSTRACE_CLOUD_PROVIDER}" == "aws" ]]; then
    cat ci/cluster-config.yaml | ./build/bin/opstrace create aws ${OPSTRACE_CLUSTER_NAME} \
        --log-level=debug --yes \
        --write-kubeconfig-file "${OPSTRACE_CLI_WRITE_KUBECFG_FILEPATH}"

    # Context: issue opstrace-prelaunch/issues/1905.
    # Copy outfile to prebuild/preamble dir. Required by
    # `make cli-publish-to-s3`.
    FNAME="cli-aws-mutating-api-calls-${CHECKOUT_VERSION_STRING}.txt" && \
        bash ci/gen-cli-aws-mutating-api-calls-list.sh "${FNAME}" && \
        cp "${FNAME}" /build/bk-artifacts && \
        cp "${FNAME}" ${OPSTRACE_PREBUILD_DIR}
else
    # Create Opstrace instance in GCP. Use custom_dns_name and
    # custom_auth0_client_id features.
    export OPSTRACE_INSTANCE_DNS_NAME="${OPSTRACE_CLUSTER_NAME}.opstracegcp.com"

    # Add install-time parameter to Opstrace install-time configuration file.
    # The Auth0 client ID corresponds to an Auth0 app configured for our CI
    echo -e "\ncustom_dns_name: ${OPSTRACE_INSTANCE_DNS_NAME}" >> ci/cluster-config.yaml
    # rely on this custom auth0 client id to already be present in the config:

    # Create a new managed DNS zone, for <foo>.opstracegcp.com -- in the CI
    # shard GCP project.
    SUBZONE_NAME="zone-${OPSTRACE_CLUSTER_NAME}"
    gcloud dns managed-zones create "${SUBZONE_NAME}" \
        --description="zone used by CI cluster ${OPSTRACE_CLUSTER_NAME}" \
        --dns-name="${OPSTRACE_INSTANCE_DNS_NAME}." # Trailing dot is important (FQDN)

    # Get nameservers corresponding to this zone, in a space-separated list.
    SUBZONE_NAMESERVERS="$(gcloud dns managed-zones describe "${SUBZONE_NAME}" \
        --format="value(nameServers)" | sed 's/;/ /g')"
    # Example output:
    # ns-cloud-c1.googledomains.com. ns-cloud-c2.googledomains.com. ns-cloud-c3.googledomains.com. ns-cloud-c4.googledomains.com.
    echo "SUBZONE_NAMESERVERS: ${SUBZONE_NAMESERVERS}"

    # We use the GCP project CI shard service account credentials to configure
    # the DNS sub zone ${OPSTRACE_CLUSTER_NAME}.opstracegcp.com. The root DNS
    # zone (opstracegcp.com.) however can only be managed in/by one specific
    # GCP project. That is, the svc accounts for the GCP project CI shards
    # cannot change settings for this root DNS zone. Connecting the two zones
    # via NS records needs to be done with a svc account for the GCP project
    # that that manages the root zone. Hence, switch GCP credentials
    # temporarily here.
    gcloud auth activate-service-account \
        --key-file="./secrets/gcp-svc-acc-dev-dns-service.json" --project "vast-pad-240918"

    # Now add an NS record to the opstracegcp.com zone for the
    # <foo>.opstracegcp.com DNS name, pointing to the name servers that are
    # authoritative for the sub zone. Upon execution of the transaction we
    # sometimes get a 412 precondition not met, also see Context:
    # https://github.com/opstrace/opstrace/issues/1068. Probably as of the SOA
    # serial number update failing. Rebuild and retry transaction until
    # success. TODO: maybe don't retry forever.
    while true
    do
        TRFNAME="gcloud_dns_transaction_${RANDOM}"
        gcloud dns record-sets transaction start \
            --zone=root-opstracegcp --transaction-file=${TRFNAME}
        gcloud dns record-sets transaction add ${SUBZONE_NAMESERVERS} \
            --transaction-file=${TRFNAME} \
            --name=${OPSTRACE_INSTANCE_DNS_NAME}. \
            --ttl=300 --type=NS --zone=root-opstracegcp
        echo "transaction file content:"
        cat ${TRFNAME}
        # temporarily lift errexit option, this is where the `412 precondition
        # not met` err may be thrown.
        set +e
        gcloud dns record-sets transaction execute --zone=root-opstracegcp --transaction-file=${TRFNAME}
        EXITCODE_DNS_TRANS=$?
        set -e

        if [ "${EXITCODE_DNS_TRANS}" -ne 0 ]; then
            echo "gcloud dns ... transaction execute failed.. retry in 5 s "
            sleep 10
        else
            echo "EXITCODE_DNS_TRANS is 0 -> transaction was accepted, leave loop"
            break
        fi
    done

    # Revert gcloud CLI authentication state to GCP project CI shard.
    gcloud auth activate-service-account \
        --key-file=${GOOGLE_APPLICATION_CREDENTIALS} \
        --project ${OPSTRACE_GCP_PROJECT_ID}

    cat ci/cluster-config.yaml | \
        ./build/bin/opstrace create gcp ${OPSTRACE_CLUSTER_NAME} \
            --log-level=debug --yes \
            --write-kubeconfig-file "${OPSTRACE_CLI_WRITE_KUBECFG_FILEPATH}"
fi

echo "--- connect kubectl to the CI cluster"
configure_kubectl_aws_or_gcp

# Makefile logic uses `OPSTRACE_KUBECFG_FILEPATH_ONHOST` to mount kubectl config into
# the test-remote container. Point to the file written by the Opstrace CLI.
export OPSTRACE_KUBECFG_FILEPATH_ONHOST="${OPSTRACE_CLI_WRITE_KUBECFG_FILEPATH}"

# TODO: remove when we add cloud provider managed certificates and remove the
# use of insecure_skip_verify in the tests
echo "--- checking cluster is using certificate issued by LetsEncrypt"

retry_check_certificate loki.system.${OPSTRACE_INSTANCE_DNS_NAME}:443
retry_check_certificate cortex.system.${OPSTRACE_INSTANCE_DNS_NAME}:443
retry_check_certificate system.${OPSTRACE_INSTANCE_DNS_NAME}:443

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

# Run the CLI tests before invoking test-remote. This excercises the basic
# tenant API authenticator keypair management capability.
echo "+++ run opstrace CLI tests (cli-tests-with-cluster.sh)"
source ci/test-cli/cli-tests-with-cluster.sh

# This runs the bulk of the tests against the Opstrace instance, also invoked
# from the upgrade test pipeline and therefore in its own file.
source ci/test-core.sh

# One child process was spawned (see start_data_collection_deployment_loop()).
# Be a good citizen and join that explicitly (expect that to have terminated by
# now, long ago).
wait
