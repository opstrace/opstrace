#!/bin/bash

set -eou pipefail

OPSTRACE_CLI_VERSION_TO="${OPSTRACE_CLI_VERSION_TO:-cli/main/latest/opstrace-cli-linux-amd64-latest.tar.bz2}"

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

echo "--- fetching cli artifacts"
fetch_cli_artifact ${OPSTRACE_CLI_VERSION_TO} to
