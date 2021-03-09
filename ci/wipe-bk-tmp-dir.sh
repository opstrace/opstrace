echo "--- wipe-bk-tmp-dir"

# Note(JP): this started as logic executed during the preamble, but these file
# system operations may cost actual wall time when /tmp is large, and therefore
# this lengthened the preamble significantly. To mitigate that, this is now
# meant to be executed after the preamble, concurrently with other build steps:
# that means: by design, what follows must be built so that it can be executed
# at any time w/o breaking current builds (by e.g. deleting dependencies
# underneath them).

set -o xtrace

# Actual artifacts (docker images, etc) are meant to be produced by the
# preamble step. The `node_modules` dir in the prebuild dir is expected to be
# larger than 1 GB -- and it must be safe to wipe it when this CI step starts.
# At the time of writing, this has to be invoked after the preamble and after
# the unit test stage, which both operate on the prebuild directory.
rm -rf "${OPSTRACE_PREBUILD_DIR}/node_modules"

# note(jp): remove this again, can take ~10 minutes easily otherwise
echo "expensive: the N largest files and directories in /tmp"
du -ha /tmp | sort -r -h | head -n 100 || true

# https://github.com/yarnpkg/yarn/issues/6685
echo "delete all yarn--* dirs in /tmp older than 2 hours"
df -h
find /tmp -name 'yarn--*' -type 'd' -not -newerct '2 hours ago' -exec rm -rf {} \; 2> /dev/null || true

echo "delete all files in /tmp older than 12 hours"
df -h
find /tmp -type 'f' \
    -not -newerct '12 hours ago' \
    -not -path "*yarn-cache-opstrace*" \
    -delete 2> /dev/null || true


echo "delete all dirs in /tmp older than 12 hours"
df -h
find /tmp -type 'd' \
    -not -newerct '12 hours ago' \
    -not -path "*yarn-cache-opstrace*" \
    -exec rm -rf {} \; 2> /dev/null || true


echo "delete all node_module dirs in /tmp older than 3 hours"
df -h
find /tmp -name 'node_modules' -type 'd' -not -newerct '3 hours ago' -exec rm -rf {} \; 2> /dev/null || true

echo "delete all .cache dirs in /tmp older than 6 hours"
df -h
find /tmp -name '.cache' -type 'd' -not -newerct '6 hours ago' -exec rm -rf {} \; 2> /dev/null || true

echo "delete all opstrace CLI files in /tmp older than 6 hours"
df -h
find /tmp -name 'opstrace' -type 'f' -not -newerct '6 hours ago' -exec rm -rf {} \; 2> /dev/null || true

set +e
ls -ahltr /tmp
set -e

# note(jp): remove this again when it becomes too expensive
echo "expensive: the N largest files and directories in /tmp"
du -ha /tmp | sort -r -h | head -n 100 || true
