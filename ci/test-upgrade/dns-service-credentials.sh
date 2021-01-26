#!/bin/bash

set -eou pipefail

#
# Import helper functions.
#
source ci/utils.sh

echo "--- setting up dns-service credentials"
curl --request POST \
    --url https://opstrace-dev.us.auth0.com/oauth/token \
    --header 'content-type: application/json' \
    --data-binary "@secrets/dns-service-login-for-ci.json" \
    | jq -jr .access_token > access.jwt
