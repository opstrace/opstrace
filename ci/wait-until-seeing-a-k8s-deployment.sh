#!/usr/bin/env bash

set -o errexit
set -o errtrace
set -o nounset
set -o pipefail

KCTL_OUTERR_FILEPATH=$(mktemp /tmp/wait-for-opstrace.XXXXXX)

# Abort waiting upon this deadline.
MAX_WAIT_SECONDS=3600
DEADLINE=$(($(date +%s) + ${MAX_WAIT_SECONDS}))

echo "temp file for kctl output: ${KCTL_OUTERR_FILEPATH}"

# Wait for one deployment to pop up that would not be there unless the
# controller deployed it (directly confirm that the controller got invoked,
# and that it deployed _something_).

echo "wait for some loki deployments to pop up"

while true
do

    if (( $(date +%s) > ${DEADLINE} )); then
        echo "deadline hit: waited for ${MAX_WAIT_SECONDS} s"
        echo "Do 'describe all --all-namespaces' for facilitating debugging"
        KCTL_DESCRIBE_ALL_FILEPATH="/build/bk-artifacts/kctl-describe-all.out"
        kubectl describe all --all-namespaces > "${KCTL_DESCRIBE_ALL_FILEPATH}"
        echo "upload ${KCTL_DESCRIBE_ALL_FILEPATH} as build artifact"
        buildkite-agent artifact upload "${KCTL_DESCRIBE_ALL_FILEPATH}"
        exit 1
    fi

    echo "list loki-related pods"
    kubectl get pods --all-namespaces | \
        grep 'loki' 2>&1 | \
        tee "${KCTL_OUTERR_FILEPATH}"
    if (( $(wc -l < "${KCTL_OUTERR_FILEPATH}") >= 1 )); then
        echo "At least one loki pod seen. Stop waiting."
        break
    fi

    echo "Continue to wait, 30 sc"
    sleep 30
done
rm "${KCTL_OUTERR_FILEPATH}"

# Ignorant method: wait until all pods are "ready".
# Also see
# https://github.com/kubernetes/kubernetes/issues/49387
# while true
# do

#     if (( $(date +%s) > ${DEADLINE} )); then
#         echo "deadline hit: waited for ${MAX_WAIT_SECONDS} s"
#         echo "Do 'describe all --all-namespaces' for facilitating debugging"
#         KCTL_DESCRIBE_ALL_FILEPATH="/build/bk-artifacts/kctl-describe-all.out"
#         kubectl describe all --all-namespaces > "${KCTL_DESCRIBE_ALL_FILEPATH}"
#         echo "upload ${KCTL_DESCRIBE_ALL_FILEPATH} as build artifact"
#         buildkite-agent artifact upload "${KCTL_DESCRIBE_ALL_FILEPATH}"
#         exit 1
#     fi

#     echo "list non-ready pods"
#     kubectl get pods --all-namespaces | \
#         grep -Ev '([0-9]+)/\1' 2>&1 | \
#         tee "${KCTL_OUTERR_FILEPATH}"
#     if [[ $(wc -l < "${KCTL_OUTERR_FILEPATH}") == 1 ]]; then
#         echo "All pods seem to be ready. Stop waiting."
#         break
#     fi

#     echo "Continue to wait, 30 sc"
#     sleep 30
# done
# rm "${KCTL_OUTERR_FILEPATH}"