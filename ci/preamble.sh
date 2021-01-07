#!/usr/bin/env bash
set -o errexit
set -o errtrace
set -o nounset
set -o pipefail

# Context: this is running in the container started from the image defined via
# opstrace-ci.Dockerfile. The build directory (within TMPDIR on host) is
# mounted at /build.

echo "running $(basename $0)"


set -o xtrace

# For debugging potential issues. `gcloud` is a moving target in our CI and
# if something fails around the gcloud CLI it's good to know exactly which
# version we ran.
gcloud --version

# Same story for the AWS CLI
aws --version

make fetch-secrets
make set-dockerhub-credentials

echo "--- lint docs: quick feedback"
make lint-docs

# If this is a docs-only change: skip the rest of the preamble, move on to the
# next build step in the BK pipeline which allows for a
# docs-only-change-fastpath-pipeline-exit.
echo "check if this is a docs-only change, exit preamble early if so"
bash ci/check-if-docs-pr.sh && exit 0

echo "--- detect missing license headers"
make check-license-headers

echo "--- lint codebase: quick feedback"
make lint-codebase

# If there are any changes to go directory then build and publish the images to
# docker hub. Update packages/controller-config/docker-images.json to use the
# newly built image tags in this test run.
# This step will check various packages and determine if docker images should be
# rebuilt and pushed.
# - cortex-proxy-api
# - loki-proxy-api
# - app
# - graphql
echo "--- Update docker-images.json"
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
${DIR}/build-docker-images-update-controller-config.sh

# Do this early when the checkout is fresh (no non-repo files within /packages
# or /lib as of previous tsc invocations -- these could erroenously invalidate
# the controller image cache layers).
echo "--- make build-and-push-controller-image"
make build-and-push-controller-image

echo "--- Compile Typescript code base, trigger pkg single-binary builds"

# First, set yarn cache to be shared across all CI runs.
# See opstrace-prelaunch/issues/1695
# and https://github.com/yarnpkg/yarn/issues/2181#issuecomment-559871605
# edit: deactivated again, see
# opstrace-prelaunch/issues/1757
# mkdir -p /tmp/yarn-cache-opstrace && yarn config set cache-folder /tmp/yarn-cache-opstrace

# tsc-build the Opstrace cluster management CLI (depends on installer and
# uninstaller) and then also pkg-build it (for linux).
echo "--- make cli-tsc"
make cli-tsc

echo "--- make cli-pkg"
make cli-pkg

# pkg-build it for macos (used for publishing artifacts). Could be moved
# to later to save a little bit of time.
echo "--- make cli-pkg-macos"
make cli-pkg-macos

echo "--- CLI single-binary sanity check"
# Quick sanity-check: confirm that CHECKOUT_VERSION_STRING is in stdout
./build/bin/opstrace --version
./build/bin/opstrace --version | grep "${CHECKOUT_VERSION_STRING}"

echo "--- make rebuild-testrunner-container-images"
make rebuild-testrunner-container-images

echo "--- build looker image"
# looker: does image build? push it, too!
# run `make image` in subshell so that cwd stays as-is
# `make image` is supposed to inherit the env variable CHECKOUT_VERSION_STRING
( cd test/test-remote/containers/looker ; make image ; make publish )

# subsequent build steps are supposed to depend on actual build artifacts
# like the pkg-based single binary CLI or Docker images. The node_modules
# dir (expected to be more than 1 GB in size) is not needed anymore. Remove it.
rm -rf node_modules

echo "--- the largest files and dirs in this prebuild dir:"
pwd
du -ha . | sort -r -h | head -n 100 || true
