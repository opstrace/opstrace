#!/usr/bin/env python3

# Regular invocation of this program ensures deletion of orphaned, empty S3
# buckets created by previous CI runs. Avoids deleting recently created
# buckets to avoid breaking currently running tests.

import calendar
import re
import subprocess
import time

# 6 hours
BUCKET_MINIMUM_AGE_SECS = 6 * 60 * 60

# expected targets like this:
#   prs-bk-5501-743-a-cortex-config
#   schedul-bk-2845-f10-a-loki
#   upgrade-bk-1186-a20-a-cortex
BUCKET_NAME_PATTERN = re.compile("[a-z]+-bk-[0-9]+-.*")


def timestamp(epoch_secs):
    return time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime(epoch_secs))


# expected list-buckets output is like this (separated by tabs):
#   BUCKETS 2021-06-28T20:49:25+00:00       sample-cortex
#   BUCKETS 2021-06-28T20:49:25+00:00       sample-cortex-config
#   BUCKETS 2021-06-28T20:49:25+00:00       sample-loki
#   BUCKETS 2021-06-28T20:49:27+00:00       sample-loki-config
#   [...]
#   OWNER   sample     abcd1234
def list_buckets():
    result = subprocess.run(
        "aws s3api list-buckets --output text --no-cli-pager",
        shell=True,
        check=True,
        capture_output=True,
    )
    return result.stdout.decode("utf-8")


def clean_buckets(now_secs, list_buckets_output):
    for line in list_buckets_output.split("\n"):
        words = line.split("\t")
        if len(words) != 3:
            continue
        (keyword, timestamp_str, name) = words

        if keyword != "BUCKETS":
            continue

        if not BUCKET_NAME_PATTERN.match(name):
            continue

        # timestamp should be UTC ISO8601 format
        try:
            timestruct = time.strptime(timestamp_str, "%Y-%m-%dT%H:%M:%S%z")
        except e:
            print("Failed to parse timestamp in line: '{}'".format(line))
            continue
        created_secs = calendar.timegm(timestruct)
        created_str = timestamp(created_secs)

        if created_secs + BUCKET_MINIMUM_AGE_SECS > now_secs:
            print(
                "Ignoring bucket created at {} (too recent): {}".format(
                    created_str, name
                )
            )
            continue

        print("Trying to delete bucket created at {}: {}".format(created_str, name))
        # expected to fail when the bucket is not empty
        result = subprocess.run(
            "aws s3api delete-bucket --bucket {}".format(name),
            shell=True,
            capture_output=True,
        )
        if result.returncode == 0:
            print("*** Bucket was deleted successfully: {}".format(name))
        else:
            # Check if it's just a BucketNotEmpty error.
            # BucketNotEmpty is common and expected when the uninstall expiration policy hasn't cleaned it yet.
            stderr = result.stderr.decode("utf-8")
            if "BucketNotEmpty" in stderr:
                # Avoid mentioning "fail" to ensure test logs aren't too noisy
                print("Bucket did not delete (not empty): {}".format(name))
            else:
                # For now we just log an error and continue - this cleanup is best-effort.
                print(
                    "Failed to delete bucket {} with unexpected error: {}".format(
                        name, result
                    )
                )


if __name__ == "__main__":
    now_secs = time.time()
    print("Current time is: {}".format(timestamp(now_secs)))
    clean_buckets(now_secs, list_buckets())
