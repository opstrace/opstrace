#!/usr/bin/env bash
set -o errexit
set -o errtrace
set -o nounset
set -o pipefail

# Read file $1 (haystack), see if sub string $2 (needle) (such as
# "FASTPATHEXIT") is present and exit with code 42 if it is.

HAYSTACK=$(cat $1)

# Credits for "is substring in big string" solution:
# https://stackoverflow.com/a/20460402/145400
if [ -z "${HAYSTACK##*$2*}" ] ; then
    exit 42;
fi
