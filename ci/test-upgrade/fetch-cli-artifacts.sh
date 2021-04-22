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
# Initial cluster install version.
#
FROM=cli/main/${OPSTRACE_CLI_VERSION_FROM}/opstrace-cli-linux-amd64-${OPSTRACE_CLI_VERSION_FROM}.tar.bz2

#
# Upgrade the cluster to this version.
#
TO=cli/main/${OPSTRACE_CLI_VERSION_TO}/opstrace-cli-linux-amd64-${OPSTRACE_CLI_VERSION_TO}.tar.bz2

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
fetch_cli_artifact ${FROM} from
fetch_cli_artifact ${TO} to
