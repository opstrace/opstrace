#!/usr/bin/env bash
set -o errexit
set -o errtrace
set -o nounset
set -o pipefail

# Goal: the data push (for metrics, logs) from the current
# to-be-tested-in-the-current-CI-run Opstrace cluster to an aggregation
# Opstrace cluster should start _during_ the `create` operation for the
# to-be-tested Opstrace cluster. See
# https://github.com/opstrace/opstrace/issues/146.
#
# This script and therefore the loop body below runs in the background,
# concurrently with a cluster `create` operation. Wait for the `create`
# procedure to at some point write out a kubeconfig file. The `kubectl apply`
# command in the loop body will fail for a while for various expected reasons:
#   - when the --kubeconfig file does not exist yet
#   - when the k8s cluster isn't reachable yet, etc.
#
# Rely on `kubectl` to exit with code 0 when the deployments have been
# submitted successfully.  Collect stderr and stdout in a file. Also stream
# stdout/err to original stdouterr / i.e. have this output interleave with
# other build log output (good enough for now, I think).

# Rely on environment variables to be set:
echo "OPSTRACE_CLUSTER_NAME: $OPSTRACE_CLUSTER_NAME"
echo "OPSTRACE_CLOUD_PROVIDER: $OPSTRACE_CLOUD_PROVIDER"
cat ci/metrics/promtail.yaml.template | envsubst > ci/metrics/promtail.yaml
cat ci/metrics/prometheus.yaml.template | envsubst > ci/metrics/prometheus.yaml

LOG_OUTERR_FILEPATH=$(mktemp /tmp/kubectl_apply.XXXXXX)
echo "temp file for kctl output: ${LOG_OUTERR_FILEPATH}"
while true
do
    # Temporarily disable errexit and enable printing executed commands.
    set +e
    set -x
    # Rely on the pipefail option.
    kubectl apply \
        -f ci/metrics/ \
        -f secrets/opstrace-ci-authtoken-secrets.yaml \
        --kubeconfig "${KUBECONFIG_FILEPATH}" |& tee -a "${LOG_OUTERR_FILEPATH}"
    kexitcode=$?
    set -e
    set +x

    if [ $kexitcode -eq 0 ]; then
        echo -e "\n\ndata collection deployment loop: kubectl apply ... succeeded, stop loop"
        break
    fi

    echo -e "\n\ndata collection deployment loop: last exit code: $kexitcode -- retry in 60 s" \
        |& tee -a "${LOG_OUTERR_FILEPATH}"
    sleep 60
done