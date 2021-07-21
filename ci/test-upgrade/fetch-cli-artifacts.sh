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
fetch_cli_s3_artifact() {
    echo "downloading ${artifact}"
    aws s3 cp --only-show-errors ${artifact} .

    echo "extracting ${artifact} to target dir ${dir}"
    tar xjf $(basename ${artifact#s3://}) -C ${dir}
}

#
# Funtion that downloads cli artifact from http uri and extracts it to a target
# dir.
#
fetch_cli_http_artifact() {
    echo "downloading ${artifact}"
    curl -L ${artifact} --output opstrace-cli-artifact.tar.bz2

    echo "extracting ${artifact} to target dir ${dir}"
    tar xjf opstrace-cli-artifact.tar.bz2 -C ${dir}
}

fetch_cli_artifact() {
    local artifact=${1}
    local dir=${2}

    mkdir -p ${dir}

    case "${artifact}" in
        http*)
            fetch_cli_http_artifact ${artifact} ${dir}
            ;;
        s3*)
            fetch_cli_s3_artifact ${artifact} ${dir}
            ;;
        *)
            echo "copying ${artifact} to ${dir}"
            [ -f "${artifact}" ] && cp ${artifact} ${dir}
            ;;
    esac
}

echo "--- fetching cli artifacts"
fetch_cli_artifact ${OPSTRACE_CLI_VERSION_FROM} from
fetch_cli_artifact ${OPSTRACE_CLI_VERSION_TO} to
