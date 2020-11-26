#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

set -o pipefail

# check if docker-images.json has the required docker images set
CORTEX_API_PROXY_IMAGE=$(cd ${DIR}/../go/ && make -s DOCKER_IMAGE_NAME=cortex-api print-docker-image-name-tag)
LOKI_API_PROXY_IMAGE=$(cd ${DIR}/../go/ && make -s DOCKER_IMAGE_NAME=loki-api print-docker-image-name-tag)

(jq -e '.cortexApiProxy == "'${CORTEX_API_PROXY_IMAGE}'"' ${DIR}/../packages/controller-config/src/docker-images.json &&
jq -e '.lokiApiProxy == "'${LOKI_API_PROXY_IMAGE}'"' ${DIR}/../packages/controller-config/src/docker-images.json) > /dev/null

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ];
then
	echo "No changes required to docker-images.json."
fi

jqi() {
	cat <<< "$(jq "$1" < "$2")" > "$2"
}

# update docker-images.json
jqi '.cortexApiProxy = "'${CORTEX_API_PROXY_IMAGE}'"' ${DIR}/../packages/controller-config/src/docker-images.json
jqi '.lokiApiProxy = "'${LOKI_API_PROXY_IMAGE}'"' ${DIR}/../packages/controller-config/src/docker-images.json

echo "Please add a commit with the required changes to docker-images.json."
