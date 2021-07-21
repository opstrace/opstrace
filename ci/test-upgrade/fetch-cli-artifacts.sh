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
# Download CLI artifact and extract it to target directory.
#
fetch_cli_artifact() {
    echo "downloading and extracting ${artifact}"
    set -x
    curl -sSL "${artifact}" | tar xjf -C ${dir}
    set +x
}

# Create output directory and put CLI artifact into that directory (by either
# downloading it or by copying it from the local file system).
copy_or_download_cli_artifact() {
    local artifact=${1}
    local dir=${2}

    mkdir -p ${dir}

    # Copy from file system location, if it exists.
    if [ -f "${artifact}" ]; then
        cp ${artifact} ${dir}
        echo "running ./${dir}/opstrace --version"
        ./${dir}/opstrace --version
    else
        # Assume that ${artifact} is a URL.
        fetch_cli_artifact ${artifact} ${dir}
        echo "running ./${dir}/opstrace --version"
        ./${dir}/opstrace --version
    fi
}

echo "--- fetching cli artifacts"
copy_or_download_cli_artifact ${OPSTRACE_CLI_VERSION_FROM} from
copy_or_download_cli_artifact ${OPSTRACE_CLI_VERSION_TO} to
