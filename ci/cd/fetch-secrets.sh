#!/bin/bash

aws s3 cp "s3://buildkite-managedsecretsbucket-100ljuov8ugv2/" secrets/ --recursive --exclude "*" \
    --include "aws-dev-svc-acc-env.sh" \
    --include "aws-loadtest-acc-env.sh" \
    --include "dns-service-login-for-ci.json" \
    --include "cdtest-tenant-api-token-default"

echo "-- renaming tenant api token filename required by test-remote"
mv secrets/cdtest-tenant-api-token-default tenant-api-token-default
