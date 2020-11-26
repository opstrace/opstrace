# to be `source`d

# Require env variable CHECKOUT_VERSION_STRING to be set.
export LOOKER_IMAGE_NAME="opstrace/looker:${CHECKOUT_VERSION_STRING}"

export TENANT_DEFAULT_LOKI_API_BASE_URL="https://loki-external.default.${OPSTRACE_CLUSTER_NAME}.opstrace.io:8443"
export TENANT_DEFAULT_CORTEX_API_BASE_URL="https://cortex-external.default.${OPSTRACE_CLUSTER_NAME}.opstrace.io:8443"

DNSIP="$(ci/dns_cache.sh)"
# Do _not_ quote $COMMON_ARGS when using it (it's in fact not a single arg, but
# multiple args).
COMMON_ARGS="-v ${OPSTRACE_BUILD_DIR}:/rundir -v /tmp:/tmp --dns ${DNSIP} ${LOOKER_IMAGE_NAME}"

# Test metrics mode of looker (super hacky)
# do not show output in main build log (it's a lot!)
# instead make sure that the *.log files are collected as build
# artifacts.
TSTRING="$(date +%Y%m%d-%H%M%S)"
docker run ${COMMON_ARGS} looker \
    "${TENANT_DEFAULT_CORTEX_API_BASE_URL}" \
    --bearer-token-file "${TENANT_DEFAULT_API_TOKEN_FILEPATH}" \
    --metrics-mode \
    --n-concurrent-streams 3 \
    --n-entries-per-stream-fragment 25000 \
    --stream-write-n-fragments 2 \
    --n-cycles 2 \
    > looker-metrics-${TSTRING}.log 2>&1
cat looker-metrics-${TSTRING}.log | tail -n 10


TSTRING="$(date +%Y%m%d-%H%M%S)"
docker run ${COMMON_ARGS} looker \
    "${TENANT_DEFAULT_LOKI_API_BASE_URL}" \
    --bearer-token-file "${TENANT_DEFAULT_API_TOKEN_FILEPATH}" \
    --n-concurrent-streams 3 \
    --n-entries-per-stream-fragment 10000 \
    --n-chars-per-msg 100 \
    --stream-write-n-fragments 15 \
    --n-cycles 3 \
    > looker-${TSTRING}.log 2>&1
cat looker-${TSTRING}.log | tail -n 10


# Different invocation, cover --change-streams-every-n-cycles
TSTRING="$(date +%Y%m%d-%H%M%S)"
docker run ${COMMON_ARGS} looker \
    "${TENANT_DEFAULT_LOKI_API_BASE_URL}" \
    --bearer-token-file "${TENANT_DEFAULT_API_TOKEN_FILEPATH}" \
    --n-concurrent-streams 3 \
    --n-entries-per-stream-fragment 1000 \
    --n-chars-per-msg 100 \
    --stream-write-n-seconds 10 \
    --n-cycles 5 \
    --change-streams-every-n-cycles 3 \
    > looker-${TSTRING}.log 2>&1
cat looker-${TSTRING}.log | tail -n 10


# Different invocation, cover --max-concurrent-writes
TSTRING="$(date +%Y%m%d-%H%M%S)"
docker run ${COMMON_ARGS} looker \
    "${TENANT_DEFAULT_LOKI_API_BASE_URL}" \
    --bearer-token-file "${TENANT_DEFAULT_API_TOKEN_FILEPATH}" \
    --n-concurrent-streams 10 \
    --n-entries-per-stream-fragment 1000 \
    --n-chars-per-msg 100 \
    --stream-write-n-fragments 10 \
    --max-concurrent-writes 2  \
    > looker-${TSTRING}.log 2>&1
cat looker-${TSTRING}.log | tail -n 10


# Different invocation, cover --max-concurrent-writes
TSTRING="$(date +%Y%m%d-%H%M%S)"
docker run ${COMMON_ARGS} looker \
    "${TENANT_DEFAULT_LOKI_API_BASE_URL}" \
    --bearer-token-file "${TENANT_DEFAULT_API_TOKEN_FILEPATH}" \
    --n-concurrent-streams 5 \
    --n-entries-per-stream-fragment 5000 \
    --n-chars-per-msg 100 \
    --stream-write-n-seconds 10 \
    --stream-write-n-seconds-jitter 5 \
    > looker-${TSTRING}.log 2>&1
cat looker-${TSTRING}.log | tail -n 10
