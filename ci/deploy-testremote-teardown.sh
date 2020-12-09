#!/usr/bin/env bash

# Skip steps if it's a docs pr
bash ci/check-if-docs-pr.sh && exit 0

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
export GOOGLE_APPLICATION_CREDENTIALS=./secrets/gcp-credentials.json

AWS_CLI_REGION="us-west-2"
GCLOUD_CLI_ZONE="us-west2-a"

configure_kubectl_aws_or_gcp() {
    if [[ "${OPSTRACE_CLOUD_PROVIDER}" == "aws" ]]; then
        aws eks --region ${AWS_CLI_REGION} update-kubeconfig --name ${OPSTRACE_CLUSTER_NAME}
    else
        gcloud container clusters get-credentials ${OPSTRACE_CLUSTER_NAME} --zone ${GCLOUD_CLI_ZONE} --project vast-pad-240918
    fi
    kubectl cluster-info
}

setup_ci_metrics() {
    cat ci/metrics/promtail.yaml.template | envsubst > ci/metrics/promtail.yaml
    cat ci/metrics/prometheus.yaml.template | envsubst > ci/metrics/prometheus.yaml

    LOG_OUTERR_FILEPATH=$(mktemp /tmp/kubectl_apply.XXXXXX)
    echo "temp file for kctl output: ${LOG_OUTERR_FILEPATH}"
    while true
    do
        # this will fail for various reasons when the k8s cluster isn't there yet
        # rely on pipefail
        # rely on the `create` procedure to at some point write out a kubeconfig file
        export KUBECONFIG=/path/to/admin.conf
        kubectl apply -f ci/metrics/ -f secrets/opstrace-ci-authtoken-secrets.yaml |& tee -a "${LOG_OUTERR_FILEPATH}"
        kexitcode=$?

        echo "setup_ci_metrics: last exit code: $kexitcode -- continue to wait (30 sec)" |& tee -a "${LOG_OUTERR_FILEPATH}"
        sleep 30
    done

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
    # `make install-gcp` below fails, beaming us to right here, w/o kubectl
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

curl --request POST \
    --url https://opstrace-dev.us.auth0.com/oauth/token \
    --header 'content-type: application/json' \
    --data-binary "@secrets/dns-service-login-for-ci.json" \
    | jq -jr .access_token > access.jwt

# Run opstrace installer locally. The installer will deploy the controller into
# the cluster and wait until deployments are 'ready'.
echo "--- create cluster "
if [[ "${OPSTRACE_CLOUD_PROVIDER}" == "aws" ]]; then
    cat ci/cluster-config.yaml | ./build/bin/opstrace create aws ${OPSTRACE_CLUSTER_NAME} --log-level=debug --yes
    # Context: issue opstrace-prelaunch/issues/1905.
    # Copy outfile to prebuild/preamble dir. Required by
    # `make cli-publish-to-s3`.
    FNAME="cli-aws-mutating-api-calls-${CHECKOUT_VERSION_STRING}.txt" && \
        bash ci/gen-cli-aws-mutating-api-calls-list.sh "${FNAME}" && \
        cp "${FNAME}" /build/bk-artifacts && \
        cp "${FNAME}" ${OPSTRACE_PREBUILD_DIR}
else
    cat ci/cluster-config.yaml | ./build/bin/opstrace create gcp ${OPSTRACE_CLUSTER_NAME} --log-level=debug --yes
fi

echo "--- connect kubectl to the CI cluster"
configure_kubectl_aws_or_gcp

#
# CI_DATA_COLLECTION is an env var set in buildkite pipeline, when set to
# "enabled" logs and metrics of the cluster are sent to opstrace ci cluster
#
if [[ "${CI_DATA_COLLECTION}" == "enabled" ]]; then
    echo "--- setup: send metrics and logs to the ci cluster"
    setup_ci_metrics
fi

# Makefile logic uses `OPSTRACE_KUBE_CONFIG_HOST` to mount kubectl config into
# the test-remote container.
export OPSTRACE_KUBE_CONFIG_HOST="${OPSTRACE_BUILD_DIR}/.kube"

# TODO: remove when we add GCP managed certificates and remove the
# use of insecure_skip_verify in the tests
echo "--- checking cluster is using certificate issued by LetsEncrypt"

check_certificate() {
    # Timeout the command after 10 seconds in case it's stuck. Redirect stderr
    # to stdout (for `timout` and `openssl`), do the grep filter on stdout, but
    # also show all output on stderr via a tee shunt.
    timeout --kill-after=10 10 \
    openssl s_client -showcerts -connect system.${OPSTRACE_CLUSTER_NAME}.opstrace.io:443 </dev/null \
    | openssl x509 -noout -issuer \
    |& tee /dev/stderr | grep "Fake LE Intermediate"
}

# Retry the certificate check up to 3 times. Wait 5s before retrying.
count=0
retries=3
until check_certificate
do
    retcode=$?
    wait=5
    count=$(($count + 1))
    if [ $count -lt $retries ]; then
        echo "failed checking if cluster is using certificate issued by LetsEncrypt, retrying in ${wait} seconds..."
        sleep $wait
    else
        exit ${retcode}
    fi
done

echo "+++ run test-remote"

# `test-remote` needs these two env vars
export TENANT_DEFAULT_API_TOKEN_FILEPATH="${OPSTRACE_BUILD_DIR}/tenant-api-token-default"
export TENANT_SYSTEM_API_TOKEN_FILEPATH="${OPSTRACE_BUILD_DIR}/tenant-api-token-system"

make test-remote

echo "+++ run looker tests"

source ci/invoke-looker.sh

echo "--- run opstrace CLI tests (cli-tests-with-cluster.sh)"
source ci/test-cli/cli-tests-with-cluster.sh
