#!/usr/bin/env bash

# Copied from
# https://git.samba.org/?p=rsync.git;a=blob_plain;f=support/rsync-no-vanished;hb=HEAD
# to workaround rsync errors handling vanished files according to
# https://unix.stackexchange.com/questions/86879/suppress-rsync-warning-some-files-vanished-before-they-could-be-transferred/298535.

IGNOREEXIT=24
IGNOREOUT='^(file has vanished: |rsync warning: some files vanished before they could be transferred)'

set -o pipefail

rsync "${@}" 2>&1 | (egrep -v "$IGNOREOUT" || true)
ret=$?

if [[ $ret == $IGNOREEXIT ]]; then
    ret=0
fi

exit $ret
