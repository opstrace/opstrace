# Note(JP): to be `source`d. The reason this is in its own file is that there
# are (at the time of writing) two consumers. Once for regular testing, and for
# upgrade-testing. Previously, they were invoking this set of tests with each
# their own code (duplicated, but not propery duplicated).

# Path to opstrace cli binary. Defaults to the binary in the build directory.
# Upgrade pipeline will override it to run the tests.
OPSTRACE_BIN=${OPSTRACE_BIN:-./build/bin/opstrace}

# The tenant API authenticator keypair management capability is confirmed to
# work -- now create a keypair, push the public key into the cluster and
# generate a tenant API authentication token for a tenant that does not
# exist yet in the cluster -- use a random name. Then inject into test-remote:
# - the name of that tenant
# - the path to the authentication token file
set -x
set +e; RNDSTRING=$( tr -dc a-z < /dev/urandom | head -c 6 ); set -e
TENANT_RND_NAME_FOR_TESTING_ADD_TENANT="testtenant${RNDSTRING}"
${OPSTRACE_BIN} ta-create-keypair ./ta-custom-keypair.pem
${OPSTRACE_BIN} ta-create-token "${OPSTRACE_CLUSTER_NAME}" \
    "${TENANT_RND_NAME_FOR_TESTING_ADD_TENANT}" ta-custom-keypair.pem > tenant-rnd-auth-token-from-custom-keypair
TENANT_RND_AUTHTOKEN="$(cat tenant-rnd-auth-token-from-custom-keypair)"
${OPSTRACE_BIN} ta-pubkeys-add \
    "${OPSTRACE_CLOUD_PROVIDER}" "${OPSTRACE_CLUSTER_NAME}" ta-custom-keypair.pem
set -x
export TENANT_RND_AUTHTOKEN
export TENANT_RND_NAME_FOR_TESTING_ADD_TENANT

# The controller config map mutation for managing the public keys (right above
# here) leads to API-serving deployments to restart. That takes a while.
# This might result in certain HTTP requests to fail with 502 Bad Gateway
# right within `test-remote` if we don't wait for these re-deployments to
# finish. Do this pragmatically. The time constant chosen is based on logs,
# see issue 944.
sleep 100

echo "+++ run test-remote"
set +e
make test-remote
EXITCODE_MAKE_TESTREMOTE=$?
set -e
echo "--- Exit status of make test-remote: ${EXITCODE_MAKE_TESTREMOTE}"

echo "+++ test-remote-ui-api"
set +e
make test-remote-ui-api
EXITCODE_MAKE_TESTREMOTE_UI_API=$?
set -e
echo "--- Exit status of make test-remote-ui-api: ${EXITCODE_MAKE_TESTREMOTE_UI_API}"

# Rely on screenshots to be created with a certain file name prefix.
cp test-remote-artifacts/uishot-*.png /build/bk-artifacts || true

echo "+++ run test-browser"
set +e
make test-browser
EXITCODE_MAKE_TEST_BROWSER=$?
set -e
echo "--- Exit status of make test-browser: ${EXITCODE_MAKE_TEST_BROWSER}"

mkdir -p /build/bk-artifacts/browser-test-result || true
mv browser-test-results /build/bk-artifacts/ || true

echo "+++ run looker tests"
source ci/invoke-looker.sh


# Delayed exit if `make test-browser` failed
if [ "${EXITCODE_MAKE_TEST_BROWSER}" -ne 0 ]; then
    echo "make test-browser did exit with code ${EXITCODE_MAKE_TEST_BROWSER}. Exit now."
    exit "${EXITCODE_MAKE_TEST_BROWSER}"
fi

# Delayed exit if `make test-remote` failed
if [ "${EXITCODE_MAKE_TESTREMOTE}" -ne 0 ]; then
    echo "make test-remote did exit with code ${EXITCODE_MAKE_TESTREMOTE}. Exit now."
    exit "${EXITCODE_MAKE_TESTREMOTE}"
fi

# Delayed exit if `make test-remote-ui-api` failed
if [ "${EXITCODE_MAKE_TESTREMOTE_UI_API}" -ne 0 ]; then
    echo "make test-remote-ui-api did exit with code ${EXITCODE_MAKE_TESTREMOTE_UI_API}. Exit now."
    exit "${EXITCODE_MAKE_TESTREMOTE_UI_API}"
fi
