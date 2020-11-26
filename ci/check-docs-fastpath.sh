#!/usr/bin/env bash
set -o errexit
set -o errtrace
set -o nounset
set -o pipefail


#	- NOT /docs change only (other changes, too)
#		- outcome 1: docs diff looks bad
#		- outcome 2: docs diff looks good (includes special case: no docs change)
#	- /docs diff only (no other changes)
#		- outcome 1: docs diff looks bad
#		- outcome 3: docs diff looks good
#
#	outcome 1 tells CI that this pipeline can be aborted as of a bad docs change.
# 	outcome 2 tells CI that docs change looks good, and that it should continue normally.
#	outcome 3 tells CI that tje docs change looks good, and that CI can stop (fast path)

# First, lint docs. Emit outcome 1 if that fails. For now, outcome 1 is when
# `make lint-docs` fails (assume errexit shell option here). Note that `make
# lint-docs` is right now also invoked in the preamble (for: super early
# pipeline error when docs-only change is BAD), but also here (for: super early
# pipeline SUCCESS exit when docs-only change is GOOD).
make lint-docs

set +e
bash ci/check-if-docs-pr.sh
retval=$?
set -e

DOCS_ONLY_CHANGE=false
if [ $retval -ne 0 ]; then
    echo "check-if-docs-pr.sh: exit code $retval: not docs-only PR"
else
    echo "check-if-docs-pr.sh: exit code 0: docs-only PR"
    DOCS_ONLY_CHANGE=true
fi

if [ "$DOCS_ONLY_CHANGE" = true ] ; then
    # "FAST PATH EXIT" on stdout is outcome 3.
    echo 'Docs-only change. Linting docs returned success. FASTPATHEXIT'.
    exit 0
fi

# exit code 0 and not having "FASPATEXI" is outcome 2.
echo "not docs-only PR. No docs change, or good docs change. Exit 0."
exit 0