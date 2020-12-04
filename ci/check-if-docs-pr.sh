#!/bin/bash
set -o xtrace

# Exit code specification: detect when this CI run has been triggered from a
# pull request (not a scheduled main build). If that is the case, inspect the
# diff: detect if this is a "docs-only" change. If that is the case, exit with
# code 0. In all other cases exit with a non-zero exit code.

# Documented with `"false" if not a pull request.`
# https://buildkite.com/docs/pipelines/environment-variables
# but may also not be set: https://github.com/buildkite/docs/pull/843

echo "BUILDKITE_PULL_REQUEST: ${BUILDKITE_PULL_REQUEST}"
if [ -z "${BUILDKITE_PULL_REQUEST}" ]; then
    echo "BUILDKITE_PULL_REQUEST is not set or empty."
    echo "docs-only PR? No: not a pull request";
    exit 1
fi

if [ "${BUILDKITE_PULL_REQUEST}" = "false" ]; then
    echo "docs-only PR? No: not a pull request"
    exit 1
fi

# List the files that are touched in the PR, filter for docs changes and remove
# whitespace. If output is empty then only docs are changed.
#
# https://docs.github.com/en/free-pro-team@latest/rest/reference/pulls#list-pull-requests-files
FILES_EDITED_IN_PR=$(
    curl \
    --retry 3 \
    --retry-delay 5 \
    --retry-all-errors \
    --silent \
    -H "Accept: application/vnd.github.v3+json" \
    https://api.github.com/repos/opstrace/opstrace/pulls/${BUILDKITE_PULL_REQUEST}/files \
  | jq -r '.[].filename'
)

# If the PR touches any of the following files then it's considered a docs only
# PR and it should skip the rest of the CI steps.
#
# Note the bashism: Within double quotes, a newline preceded by a backslash is
# removed.
ALLOWLIST="\
^docs/|\
.gitattributes|\
^.github|\
^README.md|\
^.markdownlint.json|\
ci/check-if-docs-pr.sh\
"

DOCS_ONLY_CHANGES=$(echo ${FILES_EDITED_IN_PR}| egrep -v "${ALLOWLIST}" | tr -d '[:space:]')
if [ -z "${DOCS_ONLY_CHANGES}" ];
then
    echo "--- docs only PR (${BUILDKITE_PULL_REQUEST}) - skipping next steps"
    exit 0
fi

echo "docs-only PR? PR: yes, but more changed than just docs"
exit 1
