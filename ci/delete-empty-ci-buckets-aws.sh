#!/usr/bin/env bash

set -o errexit
set -o errtrace
set -o nounset
set -o pipefail

# Regular invocation of this program ensures deletion of orphaned, empty S3
# buckets created by previous CI runs. Note: do not try to delete the N most
# recent ones (sorted by bucket _creation time_) to work against the potential
# chance of these buckets being still needed, being emtpy after just having
# been created.

echo "* s3 buckets created by any CI run (but not the youngest 20 by creation time):"
set +e
BUCKET_NAMES=$(aws s3api list-buckets --output text | \
    grep -E 'bk\-[0-9]+\-' | sort -k2 | head -n -20 | awk '{print $3}')
set -e

echo "${BUCKET_NAMES}"

for BNAME in ${BUCKET_NAMES}; do
    echo "* Try to delete bucket: ${BNAME}"
    # Note: fails fast if bucket is not yet empty.
    set -x
    aws s3api delete-bucket --bucket "${BNAME}" || true
    set +x
done
