#!/bin/bash

RNDSTRING=$( tr -dc a-z < /dev/urandom | head -c 6 || true)
TENANT_RND_NAME_FOR_TESTING_ADD_TENANT="testtenant${RNDSTRING}"
echo ${TENANT_RND_NAME_FOR_TESTING_ADD_TENANT} > /build/tenant-rnd-name

echo "--- running ta-create-keypair"
/build/to/opstrace ta-create-keypair /build/ta-custom-keypair.pem

echo "--- running ta-create-token"
/build/to/opstrace ta-create-token "${OPSTRACE_CLUSTER_NAME}" \
    "${TENANT_RND_NAME_FOR_TESTING_ADD_TENANT}" ta-custom-keypair.pem > /build/tenant-rnd-auth-token-from-custom-keypair

echo "--- running ta-create-token"
/build/to/opstrace ta-pubkeys-add "${OPSTRACE_CLOUD_PROVIDER}" "${OPSTRACE_CLUSTER_NAME}" /build/ta-custom-keypair.pem
