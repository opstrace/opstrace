#!/usr/bin/env bash

set -o errexit
set -o errtrace
set -o nounset
set -o pipefail

# Regular invocation of this program ensures deletion of orphaned, empty GCS
# buckets created by previous CI runs. Note: do not try to delete the N most
# recent ones (sorted by bucket _creation time_) to work against the potential
# chance of these buckets being still needed, being emtpy after just having
# been created.

# About that one-liner: see opstrace-prelaunch/pull/902

echo "* buckets created by any CI run (but not the youngest 20 by creation time):"
set +e
BUCKET_URLS=$(gsutil ls -L | grep -E 'gs://|Time created' | paste - - | \
    awk -F $'\t'  '{print "echo \"" $1  "  $(date -d \"" $6 "\" +%s)\"\0" }' | \
    xargs -0 -n1 bash -c | sort -k3 | awk '{print $1}' | \
    grep -E 'bk\-[0-9]+\-' | head -n -20)
set -e

echo "${BUCKET_URLS}"

for BURL in ${BUCKET_URLS}; do
    echo "* Try to delete bucket: ${BURL}"
    # (rb: remove bucket) fails fast if bucket is not yet empty.
    set -x
    gsutil rb "${BURL}" || true
    set +x
done
