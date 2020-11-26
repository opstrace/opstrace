#!/usr/bin/env bash

set -eu

if [ -z "${BUILDKITE_PULL_REQUEST}" ]; then
    exit 0
fi

if [ "${BUILDKITE_PULL_REQUEST}" = "false" ]; then
    exit 0
fi

echo '--- Fetching main branch'
git fetch -v --prune origin +refs/heads/main:refs/heads/main
