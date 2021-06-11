# to be `source`d

# Require env variable CHECKOUT_VERSION_STRING to be set.
export LOOKER_IMAGE_NAME="opstrace/looker:${CHECKOUT_VERSION_STRING}"

export TENANT_DEFAULT_LOKI_API_BASE_URL="https://loki.default.${OPSTRACE_CLUSTER_NAME}.opstrace.io"
export TENANT_DEFAULT_CORTEX_API_BASE_URL="https://cortex.default.${OPSTRACE_CLUSTER_NAME}.opstrace.io"

export TENANT_DEFAULT_API_TOKEN_FILEPATH="${OPSTRACE_BUILD_DIR}/tenant-api-token-default"
export TENANT_SYSTEM_API_TOKEN_FILEPATH="${OPSTRACE_BUILD_DIR}/tenant-api-token-system"

DNSIP="$(ci/dns_cache.sh)"
# Do _not_ quote $COMMON_ARGS when using it (it's in fact not a single arg, but
# multiple args).
COMMON_ARGS="-v ${OPSTRACE_BUILD_DIR}:/rundir \
-v /tmp:/tmp \
-v ${TENANT_DEFAULT_API_TOKEN_FILEPATH}:${TENANT_DEFAULT_API_TOKEN_FILEPATH} \
-v ${TENANT_SYSTEM_API_TOKEN_FILEPATH}:${TENANT_SYSTEM_API_TOKEN_FILEPATH} \
--dns ${DNSIP} \
${LOOKER_IMAGE_NAME}"

# Test metrics mode of looker
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


# Different invocation, cover --stream-write-n-seconds-jitter
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


# Different invocation, cover --max-concurrent-reads
# and also cover --n-fragments-per-push-message in logs mode
TSTRING="$(date +%Y%m%d-%H%M%S)"
docker run ${COMMON_ARGS} looker \
    "${TENANT_DEFAULT_LOKI_API_BASE_URL}" \
    --bearer-token-file "${TENANT_DEFAULT_API_TOKEN_FILEPATH}" \
    --n-concurrent-streams 5 \
    --n-entries-per-stream-fragment 1000 \
    --n-fragments-per-push-message 2 \
    --n-chars-per-msg 100 \
    --max-concurrent-reads 2 \
    --stream-write-n-seconds 10 \
    > looker-${TSTRING}.log 2>&1
cat looker-${TSTRING}.log | tail -n 10

# Metrics mode: use --n-fragments-per-push-message to create an HTTP request
# payload that contains samples from _many_ streams (individual time series);
# allowing for cranking up the number of concurrent streams (individual time
# series) to synthetically generate data from. Here, the parameters are chosen
# so that the expected HTTP request payload size (snappy-compressed protobuf)
# is about 0.95 MiB, just a little bit below the limit of 1.00 MiB implemented
# on the receiving end. The readout is skipped because otherwise it would
# take way too long (when done stream-by-stream and therefore it
# taking while (O(1) HTTP request per time series, i.e. O(10^5) HTTP requests).
TSTRING="$(date +%Y%m%d-%H%M%S)"
docker run ${COMMON_ARGS} looker \
    "${TENANT_DEFAULT_CORTEX_API_BASE_URL}" \
    --bearer-token-file "${TENANT_DEFAULT_API_TOKEN_FILEPATH}" \
    --metrics-mode \
    --n-concurrent-streams 100000 \
    --n-entries-per-stream-fragment 5 \
    --n-fragments-per-push-message 15000 \
    --stream-write-n-fragments 2 \
    --metrics-time-increment-ms 2000 \
    --max-concurrent-writes 6 \
    --skip-read \
    > looker-metrics-2-${TSTRING}.log 2>&1
cat looker-metrics-2-${TSTRING}.log | tail -n 10

# Test --read-n-streams-only
TSTRING="$(date +%Y%m%d-%H%M%S)"
docker run ${COMMON_ARGS} looker \
    "${TENANT_DEFAULT_CORTEX_API_BASE_URL}" \
    --bearer-token-file "${TENANT_DEFAULT_API_TOKEN_FILEPATH}" \
    --metrics-mode \
    --n-concurrent-streams 100000 \
    --n-entries-per-stream-fragment 5 \
    --n-fragments-per-push-message 15000 \
    --stream-write-n-fragments 10 \
    --metrics-time-increment-ms 2000 \
    --max-concurrent-writes 6 \
    --read-n-streams-only 1 \
    > looker-metrics-3-${TSTRING}.log 2>&1
cat looker-metrics-3-${TSTRING}.log | tail -n 10
