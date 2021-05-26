#!/bin/bash

set -eou pipefail

if [ -z ${OPSTRACE_CLI_VERSION_FROM+x} ];
then
    echo "OPSTRACE_CLI_VERSION_FROM env var is not set"
    exit 1
fi

if [ -z ${OPSTRACE_CLI_VERSION_TO+x} ];
then
    echo "OPSTRACE_CLI_VERSION_TO env var is not set"
    exit 1
fi

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
fetch_cli_artifact ${OPSTRACE_CLI_VERSION_FROM} from
fetch_cli_artifact ${OPSTRACE_CLI_VERSION_TO} to
