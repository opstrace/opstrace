#!/usr/bin/env bash

set -o errexit
set -o errtrace
set -o nounset
set -o pipefail

# Skip steps if it's a docs pr
bash ci/check-if-docs-pr.sh && exit 0

# Philosophy: run this with every PR, even if publishing from PRs is not really
# needed. Make it so that when this runs from `main` that the code path is
# practically the same as the one from non-main branches (PRs). Goal: we should
# be able to iterate on this (have credible CI feedback on that from within a
# PR) confidently: when this passes on a PR, then this should imply with
# _great_ propability that this also passes for `main`.

# TODO: provioning as `latest` should be done with an atomic switch instead of
# relying on individual commands to succeed sequentially (update might fail
# after partial mutation). See below.

# About read-after-write consistency:
# https://stackoverflow.com/a/23765216/145400
# "With this enhancement, Amazon
# S3 now supports read-after-write consistency in all regions for new objects
# added to Amazon S3. Read-after-write consistency allows you to retrieve
# objects immediately after creation in Amazon S3.""
S3_BUCKET_NAME="opstrace-ci-main-artifacts"

if [ "${BUILDKITE_BRANCH}" != "main" ]; then
    PR_OR_MAIN="prs/${BUILDKITE_PULL_REQUEST}"
else
    PR_OR_MAIN="main"
fi;

echo "BUILDKITE_PULL_REQUEST: ${BUILDKITE_PULL_REQUEST}"
echo "PR_OR_MAIN: ${PR_OR_MAIN}"

# Must not end with trailing slash.
S3_BURL_CLI="s3://${S3_BUCKET_NAME}/cli/${PR_OR_MAIN}"

# Goal: roughly the following structure:
#   s3://bucketname/cli/prs/c1c1c1c1-ci/<artifacts>
#   s3://bucketname/cli/prs/latest/<artifacts> # rather meaningless (last PR build), but code is executed!
#
#   s3://bucketname/cli/main/c1c1c1c1-ci/<artifacts>
#   s3://bucketname/cli/main/latest/<artifacts> # practically the most important set of artifacts
S3_BURL_CLI_VERSIONED="${S3_BURL_CLI}/${CHECKOUT_VERSION_STRING}"
S3_BURL_CLI_LATEST="${S3_BURL_CLI}/latest"

# The file names of the artifacts. Expected to be found/created in the current
# working directory.
FNAME_LINUX="opstrace-cli-linux-amd64-${CHECKOUT_VERSION_STRING}.tar.bz2"
FNAME_MACOS="opstrace-cli-macos-amd64-${CHECKOUT_VERSION_STRING}.tar.bz2"
FNAME_AWSAPICALLS="cli-aws-mutating-api-calls-${CHECKOUT_VERSION_STRING}.txt"

# Fail fast when this file does not exist:
# Context: opstrace-prelaunch/issues/1905
if [ -f "$FNAME_AWSAPICALLS" ]; then
    echo "$FNAME_AWSAPICALLS exists: proceed"
else
    echo "$FNAME_AWSAPICALLS does not exist: expected to be created out-of-band, before calling this."
    exit 1
fi

# Create tar balls for the CLI.
tar cjf "${FNAME_LINUX}" -C build/bin opstrace
tar cjf "${FNAME_MACOS}" -C build/bin/macos opstrace

# Upload artifacts with the version string in the object path (assumption: this
# creates fresh objects, never overwrites).
for FNAME in $FNAME_LINUX $FNAME_MACOS $FNAME_AWSAPICALLS; do
    aws s3 cp "${FNAME}" "${S3_BURL_CLI_VERSIONED}/${FNAME}" --acl public-read
done

# Expose set of artifacts non-atomically as -latest, i.e. overwrite the
# current/old -latest. Do this via sequential `aws s3 cp` commands. That means
# that this set of artifacts is going to be inconsistent for a short period of
# time, or may remain inconsistent upon unexpected falure. There is no simple,
# straight-forward solution for that on S3 (there is no "atomic directory
# rename", for example). Also see https://stackoverflow.com/a/46241522/145400.
# For inspiration, maybe look at
# https://docs.aws.amazon.com/cli/latest/reference/s3api/put-object.html with
# its `--website-redirect-location` or also at
# https://samswanke.com/2019/10/03/atomic-versioned-deploys-in-s3.html and at
# https://github.com/lucified/atomic-s3 and at
# https://stackoverflow.com/a/36359984/145400

for FNAME in $FNAME_LINUX $FNAME_MACOS $FNAME_AWSAPICALLS; do
    # replace version string with 'latest'
    # FNAME_LATEST=$(echo $FNAME | sed "s/${CHECKOUT_VERSION_STRING}/latest/g")
    FNAME_LATEST=${FNAME//${CHECKOUT_VERSION_STRING}/latest}
    aws s3 cp "${S3_BURL_CLI_VERSIONED}/${FNAME}" "${S3_BURL_CLI_LATEST}/${FNAME_LATEST}" --acl public-read
done


# Up to here, it is assumped that artifacts were published to a bucket subject
# to lifecyle rules, for deleting objects older than N days. Now, for
# opstrace-prelaunch/issues/1905 we
# also have to push the FNAME_AWSAPICALLS file to a bucket that retains objects
# for much longer, so that the individual CLI build can emit a log message with
# a public URL referring to an object -- that URL should stay valid for a long
# time.
aws s3 cp "${FNAME_AWSAPICALLS}" \
    "s3://cli-aws-mutating-api-calls/${CHECKOUT_VERSION_STRING}/${FNAME_AWSAPICALLS}" \
    --acl public-read

echo "done: publishing artifacts to S3"
