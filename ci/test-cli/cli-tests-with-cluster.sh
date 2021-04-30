# to be `source`ed.

# ./build is supposed to be the directory containing the tsc compile output and
# single-binary builds.

# For GCP, rely on `GOOGLE_APPLICATION_CREDENTIALS` to be set, pointing to
# a service account credential file (also encoding the GCP project ID).
echo "GOOGLE_APPLICATION_CREDENTIALS: $GOOGLE_APPLICATION_CREDENTIALS"

test_list() {
    set -o xtrace

    # Show complete `list` output for build log, confirm that this does not fail.
    ./build/bin/opstrace list ${OPSTRACE_CLOUD_PROVIDER} --log-level=debug

    # Confirm that current CI cluster is listed on stdout (grep exits non-zero
    # when there is no match). TODO: confirm that line starts with cluster name,
    # and that newline char comes right after cluster name.
    ./build/bin/opstrace list ${OPSTRACE_CLOUD_PROVIDER} | grep "${OPSTRACE_CLUSTER_NAME}"
    set +o xtrace

    # First, confirm that a debug log statement is emitted when stderr is
    # redirected to stdout. Then, confirm that no debug log statement is presented
    # on stdout (see opstrace-prelaunch/issues/998),
    # i.e. confirm that it is indeed emitted on stderr. For
    # the second part of the test, disable errexit mode tmprly because grep is
    # expected to fail. Note that the second part of the test relies on the fact
    # that a debug log statement *is* emitted as part of the `list` operation --
    # which is explicitly confirmed by the first part of the test. That is how the
    # two parts of the test form a logical unit.
    ./build/bin/opstrace list ${OPSTRACE_CLOUD_PROVIDER} --log-level debug 2>&1 | grep "debug"
    set +e
    ./build/bin/opstrace list ${OPSTRACE_CLOUD_PROVIDER} --log-level debug | grep "debug"
    if [[ $? != 0 ]]; then
        echo "confirmed that 'debug' not present on stdout"
    else
        echo "unexpected: 'debug' present on stdout"
        exit 1
    fi
    set -e
}

test_tenant_authenticator_custom_keypair_flow() {
  set -o xtrace

  ./build/bin/opstrace ta-pubkeys-list ${OPSTRACE_CLOUD_PROVIDER} ${OPSTRACE_CLUSTER_NAME} \
    > keyid_initial

  cat keyid_initial

  ./build/bin/opstrace ta-create-keypair ta-custom-keypair.pem
  ./build/bin/opstrace ta-create-token ${OPSTRACE_CLUSTER_NAME} \
    default ta-custom-keypair.pem > tenant-default-auth-token-from-custom-keypair
  ./build/bin/opstrace ta-pubkeys-add \
    ${OPSTRACE_CLOUD_PROVIDER} ${OPSTRACE_CLUSTER_NAME} ta-custom-keypair.pem

  ./build/bin/opstrace ta-pubkeys-list ${OPSTRACE_CLOUD_PROVIDER} ${OPSTRACE_CLUSTER_NAME} \
    > keyids_modified

  # pragmatic, non-robust wait
  sleep 80
  # Require success status code
  curl -vk --fail -H "Authorization: Bearer $(cat tenant-default-auth-token-from-custom-keypair)" \
    https://cortex.default.${OPSTRACE_CLUSTER_NAME}.opstrace.io/api/v1/labels
  set +o xtrace

  NEWKEYID=$(cat keyids_modified | grep -v $(cat keyid_initial))
  ./build/bin/opstrace ta-pubkeys-remove \
    ${OPSTRACE_CLOUD_PROVIDER} ${OPSTRACE_CLUSTER_NAME} "${NEWKEYID}"

  # here we might wait for another bit, and test that the above's request would
  # fail with a 401 response.
}

test_list
test_tenant_authenticator_custom_keypair_flow

# Confirm status command returns exit code 0
./build/bin/opstrace status ${OPSTRACE_CLOUD_PROVIDER} ${OPSTRACE_CLUSTER_NAME} --cluster-config ./ci/cluster-config.yaml
