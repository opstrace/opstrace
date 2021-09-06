#!/usr/bin/env bash
set -o errexit
set -o errtrace
set -o nounset
set -o pipefail

# fail this script upon first looker failure -- i.e. it's OK for now to not run
# the other looker-based tests (as a sane test runner should do).

# Require env variable CHECKOUT_VERSION_STRING to be set.
export LOOKER_IMAGE_NAME="opstrace/looker:${CHECKOUT_VERSION_STRING}"

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
LPREFIX="metrics" && TSTRING="$(date +%Y%m%d-%H%M%S)" && LNAME="looker-${LPREFIX}-${TSTRING}"
echo -e "\n\n Invoke looker test: ${LNAME}\n"
docker run ${COMMON_ARGS} looker \
    "${TENANT_DEFAULT_CORTEX_API_BASE_URL}" \
    --bearer-token-file "${TENANT_DEFAULT_API_TOKEN_FILEPATH}" \
    --metrics-mode \
    --n-series 3 \
    --n-samples-per-series-fragment 25000 \
    --change-series-every-n-cycles 1 \
    --stream-write-n-fragments 2 \
    --n-cycles 2 \
    > ${LNAME}.log 2>&1
echo -e "\n\n looker stdout/err tail:\n" && cat ${LNAME}.log | tail -n 15

LPREFIX="logs" && TSTRING="$(date +%Y%m%d-%H%M%S)" && LNAME="looker-${LPREFIX}-${TSTRING}"
echo -e "\n\n Invoke looker test: ${LNAME}\n"
docker run ${COMMON_ARGS} looker \
    "${TENANT_DEFAULT_LOKI_API_BASE_URL}" \
    --bearer-token-file "${TENANT_DEFAULT_API_TOKEN_FILEPATH}" \
    --n-series 3 \
    --n-samples-per-series-fragment 10000 \
    --n-chars-per-msg 100 \
    --stream-write-n-fragments 15 \
    --change-series-every-n-cycles 1 \
    --n-cycles 3 \
    --log-start-time="$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    > ${LNAME}.log 2>&1
echo -e "\n\n looker stdout/err tail:\n" && cat ${LNAME}.log | tail -n 15


# Different invocation, cover --change-series-every-n-cycles
LPREFIX="logs" && TSTRING="$(date +%Y%m%d-%H%M%S)" && LNAME="looker-${LPREFIX}-${TSTRING}"
echo -e "\n\n Invoke looker test: ${LNAME}\n"
docker run ${COMMON_ARGS} looker \
    "${TENANT_DEFAULT_LOKI_API_BASE_URL}" \
    --bearer-token-file "${TENANT_DEFAULT_API_TOKEN_FILEPATH}" \
    --n-series 3 \
    --n-samples-per-series-fragment 1000 \
    --n-chars-per-msg 100 \
    --stream-write-n-seconds 10 \
    --n-cycles 5 \
    --change-series-every-n-cycles 3 \
    --log-start-time="$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    > ${LNAME}.log 2>&1
echo -e "\n\n looker stdout/err tail:\n" && cat ${LNAME}.log | tail -n 15


# Different invocation, cover --max-concurrent-writes
LPREFIX="logs" && TSTRING="$(date +%Y%m%d-%H%M%S)" && LNAME="looker-${LPREFIX}-${TSTRING}"
echo -e "\n\n Invoke looker test: ${LNAME}\n"
docker run ${COMMON_ARGS} looker \
    "${TENANT_DEFAULT_LOKI_API_BASE_URL}" \
    --bearer-token-file "${TENANT_DEFAULT_API_TOKEN_FILEPATH}" \
    --n-series 10 \
    --n-samples-per-series-fragment 1000 \
    --n-chars-per-msg 100 \
    --stream-write-n-fragments 10 \
    --max-concurrent-writes 2  \
    --log-start-time="$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    > ${LNAME}.log 2>&1
echo -e "\n\n looker stdout/err tail:\n" && cat ${LNAME}.log | tail -n 15


# Different invocation, cover --stream-write-n-seconds-jitter
LPREFIX="logs" && TSTRING="$(date +%Y%m%d-%H%M%S)" && LNAME="looker-${LPREFIX}-${TSTRING}"
echo -e "\n\n Invoke looker test: ${LNAME}\n"
docker run ${COMMON_ARGS} looker \
    "${TENANT_DEFAULT_LOKI_API_BASE_URL}" \
    --bearer-token-file "${TENANT_DEFAULT_API_TOKEN_FILEPATH}" \
    --n-series 5 \
    --n-samples-per-series-fragment 5000 \
    --n-chars-per-msg 100 \
    --stream-write-n-seconds 10 \
    --stream-write-n-seconds-jitter 5 \
    --log-start-time="$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    > ${LNAME}.log 2>&1
echo -e "\n\n looker stdout/err tail:\n" && cat ${LNAME}.log | tail -n 15


# Different invocation, cover --max-concurrent-reads
# and also cover --n-fragments-per-push-message in logs mode
LPREFIX="logs" && TSTRING="$(date +%Y%m%d-%H%M%S)" && LNAME="looker-${LPREFIX}-${TSTRING}"
echo -e "\n\n Invoke looker test: ${LNAME}\n"
docker run ${COMMON_ARGS} looker \
    "${TENANT_DEFAULT_LOKI_API_BASE_URL}" \
    --bearer-token-file "${TENANT_DEFAULT_API_TOKEN_FILEPATH}" \
    --n-series 5 \
    --n-samples-per-series-fragment 1000 \
    --n-fragments-per-push-message 2 \
    --n-chars-per-msg 100 \
    --max-concurrent-reads 2 \
    --max-concurrent-writes 2 \
    --log-start-time="$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    --stream-write-n-seconds 10 \
    > ${LNAME}.log 2>&1
echo -e "\n\n looker stdout/err tail:\n" && cat ${LNAME}.log | tail -n 15

# Metrics mode: use --n-fragments-per-push-message to create an HTTP request
# payload that contains samples from _many_ streams (individual time series);
# allowing for cranking up the number of concurrent streams (individual time
# series) to synthetically generate data from. Here, the parameters are chosen
# so that the expected HTTP request payload size (snappy-compressed protobuf)
# is about 0.95 MiB, just a little bit below the limit of 1.00 MiB implemented
# on the receiving end. The readout is skipped because otherwise it would
# take way too long (when done stream-by-stream and therefore it
# taking while (O(1) HTTP request per time series, i.e. O(10^5) HTTP requests).
LPREFIX="metrics" && TSTRING="$(date +%Y%m%d-%H%M%S)" && LNAME="looker-${LPREFIX}-${TSTRING}"
echo -e "\n\n Invoke looker test: ${LNAME}\n"
docker run ${COMMON_ARGS} looker \
    "${TENANT_DEFAULT_CORTEX_API_BASE_URL}" \
    --bearer-token-file "${TENANT_DEFAULT_API_TOKEN_FILEPATH}" \
    --metrics-mode \
    --n-series 100000 \
    --n-samples-per-series-fragment 5 \
    --n-fragments-per-push-message 15000 \
    --stream-write-n-fragments 2 \
    --metrics-time-increment-ms 2000 \
    --max-concurrent-writes 6 \
    --skip-read \
    > ${LNAME}.log 2>&1
echo -e "\n\n looker stdout/err tail:\n" && cat ${LNAME}.log | tail -n 15

# Test --read-n-series-only
LPREFIX="metrics" && TSTRING="$(date +%Y%m%d-%H%M%S)" && LNAME="looker-${LPREFIX}-${TSTRING}"
echo -e "\n\n Invoke looker test: ${LNAME}\n"
docker run ${COMMON_ARGS} looker \
    "${TENANT_DEFAULT_CORTEX_API_BASE_URL}" \
    --bearer-token-file "${TENANT_DEFAULT_API_TOKEN_FILEPATH}" \
    --metrics-mode \
    --n-series 100000 \
    --n-samples-per-series-fragment 5 \
    --n-fragments-per-push-message 15000 \
    --stream-write-n-fragments 10 \
    --metrics-time-increment-ms 2000 \
    --max-concurrent-writes 6 \
    --read-n-series-only 1 \
    > ${LNAME}.log 2>&1
echo -e "\n\n looker stdout/err tail:\n" && cat ${LNAME}.log | tail -n 15


# Test throttling in metrics mode. Send from just one series/stream, and make
# each HTTP request cover a 100 seconds wide time window (diff between
# timestamp of first and last sample). Starting ~30 mins in the past, within
# just a small amount of POST HTTP requests we're approaching 'now' (walltime)
# with the generated samples. This is supposed to happen before the write-stop
# criterion (which is: stop after 20 seconds of writing). Enable debug log to
# see these log messages: "DummyTimeseries(..): current lag compared to wall
# time is 9.9 minutes. Sample generation is too fast. Delay generating and
# pushing the next fragment. This may take up to 10 minutes."
LPREFIX="metrics" && TSTRING="$(date +%Y%m%d-%H%M%S)" && LNAME="looker-${LPREFIX}-${TSTRING}"
echo -e "\n\n Invoke looker test: ${LNAME}\n"
docker run ${COMMON_ARGS} looker \
    "${TENANT_DEFAULT_CORTEX_API_BASE_URL}" \
    --bearer-token-file "${TENANT_DEFAULT_API_TOKEN_FILEPATH}" \
    --metrics-mode \
    --n-series 1 \
    --n-samples-per-series-fragment 10 \
    --metrics-time-increment-ms 10000 \
    --stream-write-n-seconds 20 \
    --log-level=debug \
    > ${LNAME}.log 2>&1
echo -e "\n\n looker stdout/err tail:\n" && cat ${LNAME}.log | tail -n 15
