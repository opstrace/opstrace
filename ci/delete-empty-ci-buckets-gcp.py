#!/usr/bin/env python3

# Regular invocation of this program ensures deletion of orphaned, empty GS
# buckets created by previous CI runs. Avoids deleting recently created
# buckets to avoid breaking currently running tests.

import calendar
import re
import subprocess
import time

# 6 hours
BUCKET_MINIMUM_AGE_SECS = 6 * 60 * 60

# expected targets like this:
#   "gs://upgrade-bk-1187-a20-g-loki-config/ :"
#   "gs://schedul-bk-2849-a20-g-cortex-config/ :"
#   "gs://prs-bk-5530-8bf-upgr-g-cortex/ :"
BUCKET_NAME_PATTERN = re.compile("^gs://([a-z]+-bk-[0-9]+-.*)/ :$")

# expected targets like this:
#   "	Time created:			Wed, 16 Dec 2020 20:25:14 GMT"
#   "	Time created:			Thu, 12 Aug 2021 23:49:26 GMT"
#   "	Time created:			Fri, 13 Aug 2021 05:02:14 GMT"
TIME_CREATED_PATTERN = re.compile("^\s+Time created:\s+[a-zA-Z]+, (.*) GMT$")


def timestamp(epoch_secs):
    return time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime(epoch_secs))


# expected list-buckets output is like this (separated by tabs):
# gs://sample-loki/ :
#         [...]
#         Time created:			Thu, 12 Aug 2021 11:37:36 GMT
#         [...]
# gs://sample-loki-config/ :
#         [...]
#         Time created:			Thu, 12 Aug 2021 11:37:42 GMT
#         [...]
def list_buckets():
    result = subprocess.run(
        "gsutil ls -L",
        shell=True,
        check=True,
        capture_output=True,
    )
    return result.stdout.decode("utf-8")


def clean_buckets(now_secs, list_buckets_output):
    # For each bucket, should get:
    # 1. a line containing the bucket name
    # 2. a line containing the creation timestamp
    this_bucket_name = ""
    for line in list_buckets_output.split("\n"):
        # first, search for matching CI bucket name
        if not this_bucket_name:
            name_match = BUCKET_NAME_PATTERN.match(line)
            if name_match:
                this_bucket_name = name_match.group(1)
            # either continue looking for the bucket name,
            # or start searching for the created timestamp
            continue

        # after CI bucket name is found, search for created timestamp
        created_match = TIME_CREATED_PATTERN.match(line)
        if not created_match:
            continue

        # CI bucket name and timestamp were found
        name = this_bucket_name
        this_bucket_name = ""

        # 16 Dec 2020 20:25:14
        created_str = created_match.group(1)

        try:
            timestruct = time.strptime(created_str, "%d %b %Y %H:%M:%S")
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
            "gsutil rb 'gs://{}/'".format(name),
            shell=True,
            capture_output=True,
        )
        print(result)
        if result.returncode == 0:
            print("*** Bucket was deleted successfully: {}".format(name))
        else:
            # Check if it's just a BucketNotEmpty error.
            # BucketNotEmpty is common and expected when the uninstall expiration policy hasn't cleaned it yet.
            stderr = result.stderr.decode("utf-8")
            if "BucketNotEmpty" in stderr:
                # Avoid mentioning "fail" to avoid polluting test logs
                print("Bucket did not delete (not empty): {}".format(name))
            else:
                # For now we just log an error and continue - this cleanup is best-effort.
                print(
                    "Failed to delete bucket {} with unexpected error: {}".format(
                        name, result
                    )
                )
        break


if __name__ == "__main__":
    now_secs = time.time()
    print("Current time is: {}".format(timestamp(now_secs)))
    clean_buckets(now_secs, list_buckets())
