#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

set -oux pipefail

CORTEX_API_PROXY_IMAGE=$(cd ${DIR}/../go/ && make -s DOCKER_IMAGE_NAME=cortex-api print-docker-image-name-tag)
LOKI_API_PROXY_IMAGE=$(cd ${DIR}/../go/ && make -s DOCKER_IMAGE_NAME=loki-api print-docker-image-name-tag)

echo "Check if docker images exist"
docker pull ${CORTEX_API_PROXY_IMAGE} && docker pull ${LOKI_API_PROXY_IMAGE}

if [ $? -ne 0 ];
then
	set -e

	echo "Building docker images"
	(cd ${DIR}/../go && make build-image)

	echo "Publishing docker images"
	(cd ${DIR}/../go && make publish)
fi

set -e

#
# wrapper function to edit json file inplace
#
jqi() {
  cat <<< "$(jq "$1" < "$2")" > "$2"
}

echo "Updating controller docker image configuration"
jqi '.cortexApiProxy = "'${CORTEX_API_PROXY_IMAGE}'"' ${DIR}/../packages/controller-config/src/docker-images.json

jqi '.lokiApiProxy = "'${LOKI_API_PROXY_IMAGE}'"' ${DIR}/../packages/controller-config/src/docker-images.json

echo "Updated docker images"
git --no-pager diff ${DIR}/../packages/controller-config/src/docker-images.json
