# to be `source`ed.

test_version() {
    set -o xtrace

    # Test that --version works (confirm zero exit code, show output in build log):
    ./build/bin/opstrace --version

    # Confirm that CHECKOUT_VERSION_STRING is in stdout
    ./build/bin/opstrace --version | grep "${CHECKOUT_VERSION_STRING}"

    # Confirm that --log-level works together with --version. Confirm that when
    # using the `info` level there is just 'one line', i.e. that stderr is empty.
    ./build/bin/opstrace --version --log-level=info
    LINECOUNT=$(./build/bin/opstrace --version --log-level=info 2>&1 | wc -l)
    if [ $LINECOUNT = "1" ];then
        echo "single line: expected"
    else
        echo "multi lines: unexpected (linecount: ${LINECOUNT})"
        false
    fi

    # Now test for additional pieces of build info, expected to be emitted on
    # stderr when setting --log-level debug. First, show output in build log.
    ./build/bin/opstrace --version --log-level=debug
    # sanity-check build time information and hostname. These tests rely on
    # grep's exit code (and the errexit shell opt).
    ./build/bin/opstrace --version --log-level=debug 2>&1 | grep "$(date --rfc-3339=date --utc)"
    #./build/bin/opstrace --version --log-level=debug 2>&1 | grep "$(hostname)"

    set +o xtrace
}

test_help() {
    # Confirm that help text does _not_ contain "index.js".
    ! ./build/bin/opstrace --help | grep 'index\.js'

    echo "confirm that './opstrace' has exit code 1"
    set +e
    haystack=$(./build/bin/opstrace 2>&1)
    exitcode=$?
    if [[ $exitcode == 1 ]]; then
        echo "confirmed"
    else
        echo "unexpected: exit code $exitcode"
        exit 1
    fi

    for regex in 'Available commands' 'Missing argument';
    do
    if [[ $haystack =~ $regex ]]; then
        echo "regex found in haystack: $regex"
    else
        echo "unexpected: regex not found in haystack: $regex"
        exit 1
    fi
    done

    set -e
}

test_help
test_version
