#!/bin/bash

echo "--- waiting for loki ring to be ready"

for cycle in {1..30}
do
    SHARDS=$(kubectl get --raw /api/v1/namespaces/loki/services/distributor:1080/proxy/ring | jq .shards | jq length)
    echo "number of shards in ring: ${SHARDS}"
    [[ ${SHARDS} < 3 ]] || exit 0

    sleep 30
done

echo "timeout waiting for loki ring to be ready"
exit 1
