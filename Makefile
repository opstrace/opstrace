# Dot not ignore errors in piped commands. The goal is to have `make` error
# out upon critical errors like missing files. Example for a critical error
# being swallowed:
#
#    $ cat /tmp/does-not-exist | wc -l
#    cat: /tmp/does-not-exist: No such file or directory
#    0
#    $ echo $?
#    0
#
SHELL=/bin/bash -o pipefail -o errexit -o nounset

# Set a different repo organization for pushing images to
DOCKER_REPO ?= opstrace

# The version string representing the current checkout / working directory.
# This for example defines the controller docker image tag. The default `dev`
# suffix represents a local dev environment. Override CHECKOUT_VERSION_STRING
# with a different suffix (e.g. `ci`) in the CI environment so that the
# version string attached to build artifacts reveals the environment that the
# build artifact was created in.
CHECKOUT_VERSION_STRING ?= $(shell git rev-parse --short=9 HEAD)-dev

# Assume that the host has a unix group `docker` that has write access to
# `/var/run/docker.sock`. When running non-root processes in containers that
# are supposed to have access to `/var/run/docker.sock` mounted from the host
# into the container then the host's docker gid needs to be set for the
# non-root user in the container, too. This is also true for containers started
# from within containers, which is why this piece of information needs to be
# propagated through all layers. Allow for this to be set through the
# environment.
#
# Note:  by default, `getent` is not present on MacOS.  Silently ignore.
DOCKER_GID_HOST ?= $(shell command -v getent > /dev/null 2>&1 && getent group docker | awk -F: '{print $$3}')

# Allow this to be set via environment, default for local dev setup.
OPSTRACE_KUBE_CONFIG_HOST ?= ${HOME}/.kube

# For the local dev setup set the build dir to be the absolute path to cwd. For
# example, that is required to make `make test-remote` work when started
# locally. Note(JP): I think this might be in conflict with some other
# thinking, question that, test things.
OPSTRACE_BUILD_DIR ?= $(shell pwd)

# Name of the cloud platform. Supported values are gcp and aws.
OPSTRACE_CLOUD_PROVIDER ?= gcp

OPSTRACE_GCP_PROJECT_ID ?= vast-pad-240918

# Defaults for GCP cloud platform (does not work for AWS)
ifeq (gcp,$(OPSTRACE_CLOUD_PROVIDER))
	OPSTRACE_REGION ?= us-west2
	OPSTRACE_ZONE ?= a
endif

# Defaults for AWS cloud platform
ifeq (aws,$(OPSTRACE_CLOUD_PROVIDER))
	OPSTRACE_REGION ?= us-west-2
endif

KERNEL_NAME := $(shell uname -s | tr A-Z a-z)

$(info --------------------------------------------------------------)
$(info OPSTRACE_CLUSTER_NAME is $(OPSTRACE_CLUSTER_NAME))
$(info OPSTRACE_BUILD_DIR is $(OPSTRACE_BUILD_DIR))
$(info OPSTRACE_CLOUD_PROVIDER is $(OPSTRACE_CLOUD_PROVIDER))
$(info DOCKER_GID_HOST is $(DOCKER_GID_HOST))
$(info OPSTRACE_KUBE_CONFIG_HOST is $(OPSTRACE_KUBE_CONFIG_HOST))
$(info CHECKOUT_VERSION_STRING is $(CHECKOUT_VERSION_STRING))
$(info KERNEL_NAME is $(KERNEL_NAME))
$(info --------------------------------------------------------------)

# Public interface. Below are the important targets, used on a daily basis by
# people. These targets need to stabilize (first the concepts, then the names).

.PHONY: lint-codebase
lint-codebase: lint-codebase.js lint-codebase.go


.PHONY: lint-docs
lint-docs:
	yarn run markdownlint 'docs/**/*.md'


.PHONY: tsc
tsc: cli-set-build-info-constants
	@# tsc-compile the opstrace cli and controller cli
	yarn --frozen-lockfile
	yarn build:controller
	yarn build:cli


# `make dependencies` has been part of a local dev workflow for many months,
# support this for legacy reasons for now. Will have to get used to new,
# cleaner concepts in the future, though
.PHONY: dependencies
dependencies: setup-addlicense tsc cli-pkg


.PHONY: cli
cli: cli-tsc cli-pkg


.PHONY: fetch-secrets
fetch-secrets:
	@# Fetch secrets, expected to be done before every cloud deployment.
	aws s3 cp "s3://buildkite-managedsecretsbucket-100ljuov8ugv2/vast-pad-240918-1445f1830b0e.json" secrets/gcp-credentials.json
	aws s3 cp "s3://buildkite-managedsecretsbucket-100ljuov8ugv2/" secrets/ --recursive --exclude "*" \
	--include "aws-credentials.json" \
	--include "aws-dev-svc-acc-env.sh" \
	--include "docker-credentials.json" \
	--include "saas-secrets-token.json" \
	--include "ci.id_rsa" \
	--include "ci.id_rsa.pub" \
	--include "opstrace-collection-cluster-authtoken-secrets.yaml" \
	--include "dns-service-login-for-ci.json" \
	--include "gcp-svc-acc-ci-shard-aaa.json" \
	--include "gcp-svc-acc-ci-shard-bbb.json" \
	--include "gcp-svc-acc-ci-shard-ccc.json" \
	--include "gcp-svc-acc-ci-shard-ddd.json" \
	--include "gcp-svc-acc-ci-shard-eee.json" \
	--include "gcp-svc-acc-ci-shard-fff.json"
	chmod 600 secrets/ci.id_rsa


.PHONY: kconfig
kconfig: checkenv-clustername kconfig-$(OPSTRACE_CLOUD_PROVIDER)

.PHONY: kconfig-gcp
kconfig-gcp:
	gcloud container clusters get-credentials \
		$(OPSTRACE_CLUSTER_NAME) \
		--zone $(OPSTRACE_REGION)-$(OPSTRACE_ZONE) \
		--project $(OPSTRACE_GCP_PROJECT_ID)

.PHONY: kconfig-aws
kconfig-aws:
	source ./secrets/aws-dev-svc-acc-env.sh && \
	aws eks update-kubeconfig --name $(OPSTRACE_CLUSTER_NAME) --region us-west-2
	@echo 'WARNING'
	@echo 'To fix "You must be logged in to the server (Unauthorized)" errors'
	@echo 'when using kubectl you need to run "source ./secrets/aws-dev-svc-acc-env.sh"'
	@echo 'in your shell.'


# Maybe rename to run-controller?
# Maybe create an executable script for `node ./packages/controller/build/cmd.js`
# and no makefile target at all? (so that one would type
#
# $./controller --external testcluster
#
.PHONY: controller-local
controller-local:
	node ./packages/controller/build/cmd.js --external $(OPSTRACE_CLUSTER_NAME)


.PHONY: build-and-push-controller-image
build-and-push-controller-image:
	docker build . -f containers/controller/Dockerfile -t $(DOCKER_REPO)/controller:$(CHECKOUT_VERSION_STRING)
	echo "Size of docker image:"
	docker images --format "{{.Size}}" $(DOCKER_REPO)/controller:$(CHECKOUT_VERSION_STRING)
	docker push $(DOCKER_REPO)/controller:$(CHECKOUT_VERSION_STRING)


.PHONY: clean
clean:
	@# Wipe state (might not be complete)
	yarn clean
	rm -rf ./secrets
	rm -rf node_modules
	rm -rf build


# Logic and targets below may change frequently. The targets below either carry
# implementation details used in public targets above or do not yet have
# an important role in human daily operations. They might be exercised by CI!

.PHONY: run-app-unit-tests
run-app-unit-tests:
	@echo "--- run app unit tests"
	CI=true yarn workspace @opstrace/app test

.PHONY: cli-crashtest
cli-crashtest:
	# Confirm that single-binary opstrace CLI shows stack trace with TS-based
	# line numbers. To that end, disable pipefail for the moment because the
	# first command in the pipeline is expected to exit non-zero; we're
	# interested in confirming whether grep as the last command in the pipeline
	# exits non-zero (did not find match -> error), or with exit code 0 (did
	# find match -> test passed).
	@echo "--- make cli-crashtest"
	./build/bin/opstrace crashtest || exit 0 # so that the output is visible in build log
	set +o pipefail && ./build/bin/opstrace crashtest 2>&1 | grep 'cli/src/index.ts:'


lint-codebase.js:
	yarn --frozen-lockfile
	yarn run lint

lint-codebase.go:
	# Also see https://github.com/opstrace/opstrace/issues/166
	(cd go/ && golangci-lint run --allow-parallel-runners)

.PHONY: cli-tsc
cli-tsc: cli-set-build-info-constants
	@# tsc-compile the opstrace cli (not the controller cli)
	yarn --frozen-lockfile
	yarn build:cli


.PHONY: cli-pkg
cli-pkg:
	@# pkg-build CLI for current platform (rely on the fact that this is linux
	@# in CI :).
	mkdir -p build/bin
	@export TPLATFORM="linux" && \
	if [ "${KERNEL_NAME}" = "darwin" ]; then \
        export TPLATFORM="macos";\
	fi; \
	set -o xtrace && \
	yarn run pkg packages/cli/package.json --public \
		--targets node14-$${TPLATFORM}-x64 \
		--output build/bin/opstrace \
		--options stack-trace-limit=100

.PHONY: cli-pkg-macos
cli-pkg-macos:
	@# pkg-build CLI for macos (use this in CI -- linux -- to create macos
	@# builds.
	mkdir -p build/bin/macos && yarn run pkg packages/cli/package.json --public \
		--targets node14-macos-x64 \
		--output build/bin/macos/opstrace \
		--options stack-trace-limit=100


.PHONY: generate-aws-api-call-list
generate-aws-api-call-list:
	cat opstrace_cli_create_* | \
		grep -o '\[AWS .*({' | \
		grep -vE 'headBucket|describe|list|getInstanceProfile' | \
		sed 's/ [0-9]\{3\}.*retries//g' | \
		sort | uniq


PHONY: publish-artifacts
publish-artifacts: fetch-secrets
	@# If in doubt: never trigger this manually (this is used by CI)
	source secrets/aws-dev-svc-acc-env.sh && bash ci/publish-artifacts.sh


.PHONY: cli-test-s3-latest
cli-test-s3-latest:
	curl https://opstrace-ci-main-artifacts.s3-us-west-2.amazonaws.com/cli/main/latest/opstrace-cli-linux-amd64-latest.tar.bz2 \
		--fail --silent --show-error \
		--output opstrace-cli-linux-amd64-latest.tar.bz2
	tar xjf opstrace-cli-linux-amd64-latest.tar.bz2
	stat opstrace
	file opstrace
	./opstrace --help


.PHONY: check-license-headers
check-license-headers:
	@echo "does addlicense work?"
	command -v addlicense
	# Walk through the directory tree. For every directory (that is not
	# ./.git), execute a bash process. Echo the current directory. Set the
	# extended globbing option. Add a newline in the command; for that option
	# to take effect (Otherwise bash would show a syntax error on line 0). For
	# being able to add a newline in a single-quoted string we have to add a
	# dollar sign to the front of the string (See
	# https://stackoverflow.com/a/3182519/145400). To make that work in this
	# Makefile, escape the single dollar sign with another dollar sign. Run
	# `addlicense` so that it _modifies_ the source files. `addlicense` will
	# show a "no such file or directory" error when the extended glob does not
	# match a single file in the current directory. That's fine. Note: we start
	# bash so that we can rely on bash's extended glob behavior. Also note that
	# `addlicense` does not have well-behaved recursive directory tree walking
	# behavior (with predictable pattern matching!). That's why we use
	# find/bash+extglob to control _that_ part. Fail the target when this
	# technique produces file changes (show the changes, too).
	find . -not -path '*/.git/*' \
		-not -path '*/node_modules*' \
		-not -path '*/kubernetes/src/custom-resources*' \
		-not -path '*/.cache/*' \
		-not -path '*/.npm/*' \
		-not -path './build/*' \
		-type d -exec bash -c \
		$$'echo "dir: {}"; shopt -s extglob \n addlicense -c "Opstrace, Inc." -l apache {}/@(*.ts|*.tsx|*.json|*.go|*.css)' \;
	# Show the changes. This returns non-zero when there is a diff.
	git --no-pager diff --exit-code


.PHONY: cli-set-build-info-constants
cli-set-build-info-constants:
	# Set build info constants for the next tsc-based CLI build. This also
	# affects the default value for `controller_config` (in CI, this is being
	# created and pushed by this CI run).
	#
	# Use `sed` for these replacements. Expect the exit code to be 0 for both
	# cases: replacement made, or replacement not made. Expect non-zero exit
	# code only for e.g. file not existing.
	#
	# Notes:
	# - `packages/cli/src/buildinfo.ts` is not tracked in the repository.
	# - `git branch --show-current` requires at least git 2.22 -- expected to
	#   exit non-zero in CI (there we use BUILDKITE_BRANCH, however).
	# - use in-place editing with `sed` to make this portable across Linux and
	#   macOS: https://stackoverflow.com/a/16746032/145400
	echo "// auto-generated by Makefile, not tracked in repo, do not edit" > packages/cli/src/buildinfo.ts
	cat packages/cli/src/buildinfo.ts.template >> packages/cli/src/buildinfo.ts
	_GITBRANCH="$$(git branch --show-current)" || true; BRANCH_NAME=$${BUILDKITE_BRANCH:-$$_GITBRANCH} && \
	sed -i.bak "s|<BUILD_INFO_BRANCH_NAME>|$${BRANCH_NAME}|g" \
		packages/cli/src/buildinfo.ts
	sed -i.bak "s|<BUILD_INFO_VERSION_STRING>|${CHECKOUT_VERSION_STRING}|g" \
		packages/cli/src/buildinfo.ts
	sed -i.bak "s|<BUILD_INFO_COMMIT>|$$(git rev-parse --short HEAD)|g" \
	packages/cli/src/buildinfo.ts
	sed -i.bak "s|<BUILD_INFO_TIME_RFC3339>|$$(date --rfc-3339=seconds --utc)|g" \
		packages/cli/src/buildinfo.ts
	sed -i.bak "s|<BUILD_INFO_HOSTNAME>|$$(hostname)|g" \
		packages/cli/src/buildinfo.ts
	rm packages/cli/src/buildinfo.ts.bak
	echo "generated packages/cli/src/buildinfo.ts"
	cat packages/cli/src/buildinfo.ts


.PHONY: setup-addlicense
setup-addlicense:
	(cd /tmp && go get github.com/google/addlicense)
	@echo 'You might want to add $$HOME/go/bin to your PATH: export PATH="$$HOME/go/bin:$$PATH"'
	@echo "does addlicense work?"
	command -v addlicense
	set +o pipefail && addlicense 2>&1 | grep "license type: apache" &> /dev/null

# credits: https://stackoverflow.com/a/4731504/145400
checkenv-clustername:
ifndef OPSTRACE_CLUSTER_NAME
	$(error The environment variable OPSTRACE_CLUSTER_NAME is not set)
endif

.PHONY: set-dockerhub-credentials
set-dockerhub-credentials:
	mkdir -p $(HOME)/.docker
	cat ./secrets/docker-credentials.json > $(HOME)/.docker/config.json


checkenv-builddir:
ifndef OPSTRACE_BUILD_DIR
	$(error The environment variable OPSTRACE_BUILD_DIR is not set)
endif


.PHONY: rebuild-ci-container-image
rebuild-ci-container-image:
	@# Don't set a build context. At this stage nothing from the repo should
	@# leak into the container image (image should be fully defined by the
	@# Dockerfile.) Note: this also makes the build step much faster compared
	@# sending a O(100 MB) large build context.
	docker build -t opstrace/opstrace-ci:$(CHECKOUT_VERSION_STRING) - < containers/ci/opstrace-ci.Dockerfile



# Run any make target in the CI docker container (image is defined by
# opstrace-ci.Dockerfile).
#
# - Summary of the magic provided by `make ci-<TARGET>`:
#
#       1) Copy current dir contents to a sandbox, the "build directory".
#       2) Start container from opstrace-ci.Dockerfile image
#         - mount build dir into container
#         - mount configuration / credentials into container (GKE, AWS, ...)
#       3) Run `make <TARGET>` in the container, on the build dir
#
# - Mount /tmp into the container as the common shared state space between all
#   containers run as part of CI. It's ok that it's volatile, but after a CI
#   run this is also where debug information (logs of all kinds) can be found.
#
# - Philosophy: the *current directory* defines the current code, including
#   uncommitted changes. It's not just the container image. CI container image
#   is supposed to be rebuilt only for Node/npm/kubectl version change and the
#   likes.
#
# - While the current directory defines the current state, the Makefile target
#   run here must not mutate the current directory. Assume that the target has
#   side effects in the file system. They must not happen on the checkout dir
#   that this `make ...` has been invoked from. That is where the "build dir"
#   concept comes in: `make ci-<TARGET>`, before running TARGET, copies the
#   current directory content's to the build dir, excluding some cruft. That is
#   what the `rsync` step below is doing, with relevant --exlcude args. The
#   build dir then is a place where we can do whatever we want.
#
# - Mount build dir into container, at /build. On the host it's at
#   "${OPSTRACE_BUILD_DIR}". If that's actually within /tmp on the host (should
#   be the case) then it's effectively mounted into the container twice but
#   that's fine: it's good to have /build in the container as _the_ place
#   representing the code checkout that's being worked on/in, the part of the
#   file system being built from and _to_ (file system modification is
#   happening here). Why not only having /build within the container? For
#   debuggability. If the build crashes, the build dir should be left behind
#   (/tmp on host is a good place).
#
# - The proper way to start a build in CI is when the build dir does not exist
#   yet. This ensures that no previous build state leaks into the build, that
#   the build is fully defined by the current checkout. for local development
#   however just emit a warning, and rsync source into dest again.
#
# - While writing this I plan for "${OPSTRACE_BUILD_DIR}" to be something like
#   /tmp/opstrace-191204-150127-7ee99be-bk-xxx, containing the time, the git
#   revision, and the buildkite build ID.
#
# - Explicitly inherit OPSTRACE_CLUSTER_NAME env variable.
#
# - Explicitly inherit AWS CLI configuration: on the buildkite agent the host's
#   AWS CLI config allows for simply fetching things from our buildkite-managed
#   S3 secrets bucket (no need to use the magic env script which their docs
#   recommend).
#
# - Note that an `npm install` as root in the container fails with dubious
#   ENOENT and permission errors (despite being run as root). A decent
#   workaround is to run this as the current hostmachine user.
#
# - Set $HOME to `/build` so that kubectl/gcloud configuration changes are
#   after all written to the build dir, on the host, so that other containers
#   can pick them up.
#
# - Note: `make ci-<TARGET>` can run any target in this Makefile in said
#   Docker container. However, as part of CI, only one is tested: there we
#   call `make ci-deploy-testremote-teardown`. This is known to work. Other
#   targets might fail in subtle ways.
#
# - Setup a DNS cache per
# https://aws.amazon.com/premiumsupport/knowledge-center/dns-resolution-failures-ec2-linux/
# to workaround DNS resolution failures in EC2.
#
ci-%: checkenv-builddir
	@echo -e "\n\n+ make ci-$*"
	@echo "* OPSTRACE_BUILD_DIR: ${OPSTRACE_BUILD_DIR}"
	@echo "* copy current dir content ("checkout") $$(pwd) to build dir"
	@if [ -d "${OPSTRACE_BUILD_DIR}" ]; then \
		echo "warning: build dir ${OPSTRACE_BUILD_DIR} already exists"; \
	fi
	mkdir -p "${OPSTRACE_BUILD_DIR}" && \
	./ci/rsync.sh -avr \
		--exclude='*node_modules*' \
		--exclude='.npm' \
		--exclude='.node-version' \
		--exclude='.cache' \
		./ "${OPSTRACE_BUILD_DIR}" > ${OPSTRACE_BUILD_DIR}/_rsync.stdout
	@echo -e "\n\n* build dir stat on host (outside container):"
	stat "${OPSTRACE_BUILD_DIR}"
	@echo -e "\n\n* invoke in CI container: make $*"
	docker run -ti \
	-v /tmp:/tmp \
	-v ${OPSTRACE_BUILD_DIR}:/build \
	-v ${PWD}:/checkout-readonly:ro \
	-v ${HOME}/.aws:/awsconfig:ro \
	-v /etc/passwd:/etc/passwd \
	-v /var/run/docker.sock:/var/run/docker.sock \
	-e AWS_SHARED_CREDENTIALS_FILE=/awsconfig/credentials \
	-e HOME=/build \
	-e OPSTRACE_CLUSTER_NAME \
	-e OPSTRACE_BUILD_DIR \
	-e OPSTRACE_PREBUILD_DIR \
	-e OPSTRACE_CLOUD_PROVIDER \
	-e BUILDKITE_BUILD_NUMBER \
	-e BUILDKITE_PULL_REQUEST \
	-e BUILDKITE_COMMIT \
	-e BUILDKITE_BRANCH \
	-e CHECKOUT_VERSION_STRING \
	-e PKG_CACHE_PATH \
	-e DOCKER_GID_HOST=${DOCKER_GID_HOST} \
	-e CI_DATA_COLLECTION \
	-u $(shell id -u):${DOCKER_GID_HOST} \
	--dns $(shell ci/dns_cache.sh) \
	opstrace/opstrace-ci:$(CHECKOUT_VERSION_STRING) \
	bash -c "cd /build && echo && pwd && ls -a && make $*"



.PHONY: rebuild-testrunner-container-images
rebuild-testrunner-container-images:
	@echo "* (Re)build and pull test runner container image(s)"
	# temporarily pull repo-global yarn lock file into test/test-remote so
	# that `yarn install` in there respects that (repo root not part of build
	# context).
	cp -n yarn.lock test/test-remote
	docker build --rm --force-rm \
		--tag opstrace/test-remote:$(CHECKOUT_VERSION_STRING) \
		-f ./test/test-remote/nodejs-testrunner.Dockerfile test/test-remote/
	rm -f test/test-remote/yarn.lock
	docker pull opstrace/systemlog-fluentd:fe6d0d84-dev
	docker pull prom/prometheus:v2.21.0


.PHONY: test-remote
test-remote:
	@# Mount ~/.kube into container: the testrunner requires kubectl to be
	@# available and properly configured in the cluster.
	@#
	@# The test runner's intended wait to leave file system artifacts behind is
	@# on the host in ${OPSTRACE_BUILD_DIR} is through writing to
	@# `/test-remote-artifacts` in the container
	@#
	@# --tty for colorized output in the terminal
	@#
	@# Note(JP): can we do -i to make this Ctrl+C/SIGINTable?
	@#
	@echo "* Local testrunner, tests a remote cluster through network"
	@echo "* Expects kubectl to be configured against to-be-tested cluster"
	@# Dump cluster-info outside container, for debugging
	kubectl cluster-info
	mkdir -p ${OPSTRACE_BUILD_DIR}/test-remote-artifacts
	@echo "* Start NodeJS/Mocha testrunner in container"
	source ./secrets/aws-dev-svc-acc-env.sh && \
	docker run --tty --interactive --rm \
		--net=host \
		-v ${OPSTRACE_BUILD_DIR}/test/test-remote:/test-remote \
		-v ${OPSTRACE_BUILD_DIR}/secrets:/secrets \
		-v ${OPSTRACE_BUILD_DIR}:/test-remote-artifacts \
		-v ${OPSTRACE_KUBE_CONFIG_HOST}:/kubeconfig:ro \
		-v /tmp:/tmp \
		-u $(shell id -u):${DOCKER_GID_HOST} \
		-v /etc/passwd:/etc/passwd \
		-v /var/run/docker.sock:/var/run/docker.sock \
		-e KUBECONFIG=/kubeconfig/config \
		-e TEST_REMOTE_ARTIFACT_DIRECTORY=/test-remote-artifacts \
		-e OPSTRACE_CLUSTER_NAME \
		-e OPSTRACE_CLOUD_PROVIDER \
		-e TENANT_DEFAULT_API_TOKEN_FILEPATH \
		-e TENANT_SYSTEM_API_TOKEN_FILEPATH \
		-e AWS_ACCESS_KEY_ID \
		-e AWS_SECRET_ACCESS_KEY \
		--dns $(shell ci/dns_cache.sh) \
		opstrace/test-remote:$(CHECKOUT_VERSION_STRING) \
		bash -O extglob -O dotglob -c 'cp -va --no-clobber /test-remote/!(node_*) . && yarn run mocha --grep test_ui --invert'

# Note(JP): dirty duplication. This is supposed to be the _exact_ same as the
# test-remote target abvove, but instead of
#    yarn run mocha --grep test_ui --invert
# do
#    DEBUG=pw:api
#    yarn run mocha --grep test_ui
# -> `make test-remote` runs all tests except those that have `test_ui` in their
#     suite/test name. `make test-remote-ui` runs all tests that match.
#     Note: `--invert, -i  Inverts --grep and --fgrep matches`.
.PHONY: test-remote-ui
test-remote-ui:
	kubectl cluster-info
	mkdir -p ${OPSTRACE_BUILD_DIR}/test-remote-artifacts
	source ./secrets/aws-dev-svc-acc-env.sh && \
	docker run --tty --interactive --rm \
		--net=host \
		-v ${OPSTRACE_BUILD_DIR}/test/test-remote:/test-remote \
		-v ${OPSTRACE_BUILD_DIR}/secrets:/secrets \
		-v ${OPSTRACE_BUILD_DIR}:/test-remote-artifacts \
		-v ${OPSTRACE_KUBE_CONFIG_HOST}:/kubeconfig:ro \
		-v /tmp:/tmp \
		-u $(shell id -u):${DOCKER_GID_HOST} \
		-v /etc/passwd:/etc/passwd \
		-v /var/run/docker.sock:/var/run/docker.sock \
		-e KUBECONFIG=/kubeconfig/config \
		-e TEST_REMOTE_ARTIFACT_DIRECTORY=/test-remote-artifacts \
		-e OPSTRACE_CLUSTER_NAME \
		-e OPSTRACE_CLOUD_PROVIDER \
		-e TENANT_DEFAULT_API_TOKEN_FILEPATH \
		-e TENANT_SYSTEM_API_TOKEN_FILEPATH \
		-e AWS_ACCESS_KEY_ID \
		-e AWS_SECRET_ACCESS_KEY \
		--dns $(shell ci/dns_cache.sh) \
		opstrace/test-remote:$(CHECKOUT_VERSION_STRING) \
		bash -O extglob -O dotglob -c 'cp -va --no-clobber /test-remote/!(node_*) . && DEBUG=pw:api yarn run mocha --grep test_ui'


# Used by CI:
# three outcomes:
#	- NOT /docs change only (other changes, too)
#		- outcome 1: docs diff looks bad
#		- outcome 2: docs diff looks good (includes special case: no docs change)
#	- /docs diff only (no other changes)
#		- outcome 1: docs diff looks bad
#		- outcome 3: docs diff looks good
#
#	outcome 1 tells CI that this pipeline can be aborted as of a bad docs change.
# 	outcome 2 tells CI that docs change looks good, and that it should continue normally.
#	outcome 3 tells CI that tje docs change looks good, and that CI can stop (fast path)
.PHONY: check-docs-fastpath
check-docs-fastpath:
	bash "ci/check-docs-fastpath.sh"


.PHONY: website-build
website-build:
	cd website && yarn install && yarn build


.PHONY: deploy-testremote-teardown
deploy-testremote-teardown:
	bash "ci/deploy-testremote-teardown.sh"

#
# Run all the unit tests.
#
.PHONY: unit-tests
unit-tests: node_modules \
	cli-crashtest \
	cli-tests-no-cluster \
	run-app-unit-tests \
	ts-unit-tests \
	go-unit-tests

node_modules:
	yarn --frozen-lockfile

.PHONY: cli-tests-no-cluster
cli-tests-no-cluster:
	@echo "--- run CLI tests that do not need a cluster (cli-tests-pre-cluster.sh)"
	CHECKOUT_VERSION_STRING=${CHECKOUT_VERSION_STRING} source ci/test-cli/cli-tests-pre-cluster.sh

.PHONY: go-unit-tests
go-unit-tests:
	@echo "--- run go unit tests"
	cd go && make unit-tests

.PHONY: ts-unit-tests
ts-unit-tests:
	@echo "--- run lib unit tests"
	cd lib/kubernetes && CI=true yarn test

.PHONY: preamble
preamble:
	bash "ci/preamble.sh"

.PHONY: deploy-upgrade-testremote-teardown-push
deploy-upgrade-testremote-teardown-push:
	bash "ci/deploy-upgrade-testremote-teardown-push.sh"

.PHONY: update-api-proxy-docker-images.json
update-api-proxy-docker-images.json:
	./ci/update-api-proxy-docker-images.json.sh
