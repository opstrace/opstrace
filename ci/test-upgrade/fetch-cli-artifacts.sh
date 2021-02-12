#!/bin/bash

set -eou pipefail

echo "--- finding last two available cli versions"
#
# Read the last two available cli versions into a bash array
#
LAST_AVAILABLE_CLI_ARTIFACTS=($(
    aws s3 ls --recursive  opstrace-ci-main-artifacts/cli/main/ | \
    grep opstrace-cli-linux-amd64 | \
    grep -v latest | \
    sort -n | \
    tail -2 | \
    awk '{print $4}'
))

#
# Funtion that downloads cli artifact from s3 bucket and extracts it to a target
# dir.
#
fetch_cli_artifact() {
    local artifact=${1}
    local dir=${2}

    echo "downloading ${artifact}"
    mkdir -p ${dir}
    aws s3 cp --only-show-errors s3://opstrace-ci-main-artifacts/${artifact} .

    echo "extracting ${artifact} to target dir ${dir}"
    tar xjf $(basename ${artifact}) -C ${dir}
}

echo "--- fetching last two available cli artifacts"
fetch_cli_artifact ${LAST_AVAILABLE_CLI_ARTIFACTS[0]} from
fetch_cli_artifact ${LAST_AVAILABLE_CLI_ARTIFACTS[1]} to
