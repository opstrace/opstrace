#!/bin/bash

echo "--- waiting for loki ring to be ready"

function check_distributor() {
    local pod=${1}
    echo "set up port-forward to pod ${pod}"
    # Pick a random port in the given range.
    local PORT=$(shuf -i 8080-9000 -n 1)
    # This process is killed when the container running this script exits.
    kubectl --namespace loki port-forward pod/${pod} ${PORT}:1080 &
    echo "waiting for pod ${pod} to report ring is ready"
    for cycle in {1..20}
    do
        # The initial sleep here waits for the port forwarding to be set up.
        sleep 30
        SHARDS=$(curl -m 20 -s -H "Accept: application/json, */*"  http://localhost:${PORT}/ring | jq .shards | jq length)
        echo "pod ${pod}: reports number of shards in ring: ${SHARDS}"

        (( ${SHARDS} >= 3 )) && break
    done
}

DISTRIBUTORS=$(kubectl --namespace loki get pods --no-headers -o custom-columns=":metadata.name" | grep distributor)

for pod in ${DISTRIBUTORS}
do
    check_distributor ${pod}
    (( ${SHARDS} < 3 )) && echo "timeout waiting for loki ring to be ready" && exit 1
done

exit 0
