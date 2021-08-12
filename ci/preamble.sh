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
# version we ran. Same for the AWS CLI
gcloud --version
aws --version
echo "--- current working directory: $(pwd)"

make fetch-secrets
make set-dockerhub-credentials

echo "--- lint docs: quick feedback"
make lint-docs


# If this is a docs-only change: skip the rest of the preamble, move on to the
# next build step in the BK pipeline which allows for a
# docs-only-change-fastpath-pipeline-exit.
echo "--- check if this is a docs-only change, exit preamble early if so"
bash ci/check-if-docs-pr.sh && exit 0

echo "--- detect missing license headers"
make check-license-headers

# This is needed also by the controller image build, by the CLI build,
# and various other artifact builds.
echo "--- make set-build-info-constants"
make set-build-info-constants

# Soft-link the node_modules dir in the container image to here where the main
# `package.json` is. Alternative is maybe to create a .yarnrc containing
# --modules-folder /node_modules. The challenge is that /build is _mounted_
# into the container, while /node_modules is already there.
#ln -s /node_modules ./node_modules
# update: https://github.com/yarnpkg/yarn/issues/8079#issuecomment-622817604 -- huh
echo "--- cp -a /node_modules ./node_modules"
cp -a /node_modules ./node_modules


# The depenencies for this linting effort should all be in the CI
# container image, i.e. this should not rely on `yarn --frozen-lockfile`
echo "--- start in background: make lint-codebase "
# Unique directory, because when this overlaps with prettier then this may
# happe: Error: ENOENT: no such file or directory, open '/build/packages/app/src/client/flags.ts'
LINT_BUILD_DIR=$(mktemp -d --tmpdir=/tmp build-dir-lint-XXXX)
cp -a . "$LINT_BUILD_DIR/opstrace"
( cd "$LINT_BUILD_DIR/opstrace" &&  make lint-codebase ) \
    &> make_lint_codebase.outerr < /dev/null &
LINT_CODEBASE_PID="$!"

# Update ../packages/controller-config/docker-images.json to use image tags
# derived from this current checkout. If images are not yet on docker hub then
# build and push these images. Rely on the idea that
# `build-docker-images-update-controller-config.sh` writes the new
# docker-images.json as early as it can. Copy the current opstrace repo
# checkout to a tmp dir for all of what
# `build-docker-images-update-controller-config.sh` is doing so that we can
# start other operations in this "actual" checkout dir, concurrently.
echo "--- start in background: regenerate docker-images.json, then build go / app docker images"
DOCKER_IMAGES_BUILD_DIR=$(mktemp -d --tmpdir=/tmp build-dir-docker-images-XXXX)
cp -a . "$DOCKER_IMAGES_BUILD_DIR/opstrace"
export WRITE_NEW_DOCKER_IMAGES_JSON_FILE_HERE_ABSPATH="$(pwd)/new-docker-images.json"
( cd "$DOCKER_IMAGES_BUILD_DIR/opstrace/ci" &&  bash build-docker-images-update-controller-config.sh ) \
    &> build-docker-images-update-controller-config.outerr < /dev/null &
DOCKER_IMAGES_BUILD_PID="$!"

# Before moving on to starting the controller image build, wait for the new
# docker-images.json to have been generated.
DIJSON_PATH="packages/controller-config/src/docker-images.json"
set +x
while true
do
    if test -f "$WRITE_NEW_DOCKER_IMAGES_JSON_FILE_HERE_ABSPATH"; then
        echo "$WRITE_NEW_DOCKER_IMAGES_JSON_FILE_HERE_ABSPATH exists. Overwrite the 'old' one."
        /bin/cp "$WRITE_NEW_DOCKER_IMAGES_JSON_FILE_HERE_ABSPATH" "${DIJSON_PATH}" # overwrite desired
        echo "git --no-pager diff ${DIJSON_PATH}"
        git --no-pager diff "${DIJSON_PATH}"
        echo "leave loop"
        break
    else
        echo "new docker-images.json not yet written, wait"
    fi
    sleep 1
done
set -x

# The controller image build requires (only) the newly generated
# docker-images.json and the side effect of `make set-build-info-constants`.
# Use separate directory with this more-or-less fresh checkout for the
# container image build: /lib and /packages etc might get polluted by
# concurrent tsc / lint tooling, -- these changnes erroenously invalidate the
# controller image cache layers).
echo "--- start in background: make build-and-push-controller-image"
CONTROLLER_BUILD_DIR=$(mktemp -d --tmpdir=/tmp build-dir-controller-XXXX)
cp -a . $CONTROLLER_BUILD_DIR/opstrace
( cd $CONTROLLER_BUILD_DIR/opstrace && make build-and-push-controller-image ) \
    &> build-and-push-controller-image.outerr < /dev/null &
CONTROLLER_IMAGE_BUILD_PID="$!"

echo "--- start in background: make rebuild-testrunner-container-images"
TESTRUNNER_IMG_BUILD_DIR=$(mktemp -d --tmpdir=/tmp build-dir-testrunner-XXXX)
cp -a . $TESTRUNNER_IMG_BUILD_DIR/opstrace
( cd $TESTRUNNER_IMG_BUILD_DIR/opstrace && make rebuild-testrunner-container-images ) \
    &> rebuild-testrunner-container-images.outerr < /dev/null &
TESTRUNNER_IMG_IMAGE_BUILD_PID="$!"

# Note(JP): this command is expected to take a minute or so (e.g., 70.35 s).
# Start this now in the background, redirect output to file. Wait for and
# handle error later, below.
echo "--- start in background: yarn --frozen-lockfile"
# The "UI APP" dependencies are not needed anywhere but in the container image
# build for it. Deactivate this package here for a moment during running yarn.
# This is expected to cut 1.5 minutes from the preamble which is more than 20 %
# of the preamble runtime when nothing in packages/app changed (i.e. when the
# container image is not rebuilt).
#mv packages/app/package.json packages/app/package.json.deactivated
rm -rf packages/app
yarn --frozen-lockfile --ignore-optional \
    &> preamble_yarn_install.outerr < /dev/null &
YARN_PID="$!"
sleep 1 # so that the xtrace output is in this build log section

echo "--- wait for background process: yarn"
# What follows requires the `yarn` dep installation above to have completed.
set +e
wait $YARN_PID
YARN_EXIT_CODE="$?"
echo "yarn process terminated with code $YARN_EXIT_CODE. stdout/err:"
cat preamble_yarn_install.outerr
if [[ $YARN_EXIT_CODE != "0" ]]; then
    echo "yarn failed, exit 1"
    exit 1
fi
set -e

# tsc-compile the CLI. This requires the yarn dep setup to have completed.
echo "--- start in background: yarn build:cli"
# do not use `make cli-tsc` because that would run the yarn installation again.
yarn build:cli &> tsc_cli.outerr < /dev/null &
TSC_CLI_PID="$!"
sleep 1 # so that the xtrace output is in this build log section


echo "--- prettier --check on typescript files"
# Enforce consistent code formatting, based on .prettierrc and .prettierignore
prettier --check 'lib/**/*.ts'
prettier --check 'packages/**/*.ts'
prettier --check 'test/**/*.ts'

echo "--- build looker image"
# looker: does image build? push it, too!
# run `make image` in subshell so that cwd stays as-is
# `make image` is supposed to inherit the env variable CHECKOUT_VERSION_STRING
( cd test/test-remote/looker ; make image ; make publish )

echo "--- build looker in non-isolated environment (for local dev)"
# Note(JP): the looker build via Dockerfile is special. During local looker
# dev, I am used to using a different build method. Which might break when it's
# not covered by CI.
( cd test/test-remote/looker; yarn ; yarn run tsc --project tsconfig.json)


# Need to wait for completion of this before moving on to make cli-pkg
echo "--- wait for background process: yarn build:cli"
set +e
wait $TSC_CLI_PID
TSC_CLI_EXIT_CODE="$?"
echo "yarn build:cli terminated with code $TSC_CLI_EXIT_CODE. stdout/err:"
cat tsc_cli.outerr
if [[ $TSC_CLI_EXIT_CODE != "0" ]]; then
    echo "yarn build:cli failed, exit 1"
    exit 1
fi
set -e



echo "--- wait for background process: make lint-codebase"
set +e
wait $LINT_CODEBASE_PID
LINT_CODEBASE_PID="$?"
echo "make lint-codebase terminated with code $LINT_CODEBASE_PID. stdout/err:"
cat make_lint_codebase.outerr
set -e
if [[ $LINT_CODEBASE_PID != "0" ]]; then
    echo "make lint-codebase failed, exit 1"
    exit 1
fi



echo "--- make cli-pkg (for linux and mac)"
echo "warning: interleaved output of two commands"
# note(JP) start in background , then also start the macos build. Each takes
# about one minute, i.e. we want to save about one minute here (these are
# executed on a beefy machine)
make cli-pkg &
_PID1="$!"
sleep 5 && echo -e "\n\n" # so that the output is not worst-case interleaved
make cli-pkg-macos &
_PID2="$!"
# wait for these two background processes to exit.
wait $_PID1 $_PID2

# Note(JP): keep these ideas here for the moment.
# First, set yarn cache to be shared across all CI runs.
# See opstrace-prelaunch/issues/1695
# and https://github.com/yarnpkg/yarn/issues/2181#issuecomment-559871605
# edit: deactivated again, see
# opstrace-prelaunch/issues/1757
# mkdir -p /tmp/yarn-cache-opstrace && yarn config set cache-folder /tmp/yarn-cache-opstrace


echo "--- CLI single-binary sanity check"
# Quick sanity-check: confirm that CHECKOUT_VERSION_STRING is in stdout
./build/bin/opstrace --version
./build/bin/opstrace --version | grep "${CHECKOUT_VERSION_STRING}"


echo "--- wait for background process:  make build-and-push-controller-image"
set +e
wait $CONTROLLER_IMAGE_BUILD_PID
CONTROLLER_IMAGE_BUILD_EXIT_CODE="$?"
echo "make build-and-push-controller-image terminated with code $CONTROLLER_IMAGE_BUILD_EXIT_CODE. stdout/err:"
cat build-and-push-controller-image.outerr
if [[ $CONTROLLER_IMAGE_BUILD_EXIT_CODE != "0" ]]; then
    echo "make build-and-push-controller-image failed, exit 1"
    exit 1
fi
set -e


echo "--- wait for background process: build-docker-images-update-controller-config.sh"
set +e
wait $DOCKER_IMAGES_BUILD_PID
DOCKER_IMAGES_BUILD_PID_EXIT_CODE="$?"
echo "build-docker-images-update-controller-config.sh terminated with code $DOCKER_IMAGES_BUILD_PID_EXIT_CODE. stdout/err:"
cat build-docker-images-update-controller-config.outerr
if [[ $DOCKER_IMAGES_BUILD_PID_EXIT_CODE != "0" ]]; then
    echo "build-docker-images-update-controller-config.sh failed, exit 1"
    exit 1
fi
set -e


echo "--- wait for background process: make rebuild-testrunner-container-images"
set +e
wait $TESTRUNNER_IMG_IMAGE_BUILD_PID
TESTRUNNER_IMG_IMAGE_BUILD_EXIT_CODE="$?"
echo "make rebuild-testrunner-container-images terminated with code $TESTRUNNER_IMG_IMAGE_BUILD_EXIT_CODE. stdout/err:"
cat rebuild-testrunner-container-images.outerr
if [[ $TESTRUNNER_IMG_IMAGE_BUILD_EXIT_CODE != "0" ]]; then
    echo "make rebuild-testrunner-container-images failed, exit 1"
    exit 1
fi
set -e


echo "--- copy files to artifact directory"
# Collect the stdout/err files of the individual processes as buildkite artifacts
cp -av ./*.outerr ${OPSTRACE_ARTIFACT_DIR} || true

# subsequent build steps are supposed to depend on actual build artifacts like
# the pkg-based single binary CLI or Docker images. The node_modules dir
# (expected to be more than 1 GB in size) is not needed anymore. Remove it.
# Note(JP): as of today (March 2021) we seem to install node_modules again
# right thereafter, for the unit tests... That should probably be consolidated
# :).
rm -rf node_modules

echo "--- the largest files and dirs in this prebuild dir:"
pwd
du -ha . | sort -r -h | head -n 100 || true
