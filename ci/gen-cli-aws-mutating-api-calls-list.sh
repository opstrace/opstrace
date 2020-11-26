#!/usr/bin/env bash

set -o errexit
set -o errtrace
set -o nounset
set -o pipefail

# Expected to be run straight after calling `opstrace create aws ...`
# Ereates file in current working directory.
# context: opstrace-prelaunch/issues/1905

if [ -n "$1" ]; then
    OUTFNAME="${1}"
    echo "generate list of AWS-mutating API calls, save output to ${OUTFNAME}"
else
    echo "first arg (outfile path) is required"
    exit 1
fi

ls opstrace_cli_create_*log

cat opstrace_cli_create_*log | \
    grep -o '\[AWS .*({' | \
    grep -vE 'headBucket|describe|list|getInstanceProfile' | \
    sed 's/ [0-9]\{3\}.*retries//g' | \
    sed 's/({//g' | \
    sort | uniq > "${OUTFNAME}"

cat "${OUTFNAME}"
echo "line count in ${OUTFNAME}:"
cat "${OUTFNAME}" | wc -l

if [[ $(wc -l <"${OUTFNAME}") -lt 5 ]]; then
    echo "error: unexpectedly short: ${OUTFNAME}"
    exit 1
fi
