#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

set -oux pipefail

CORTEX_API_PROXY_IMAGE=$(cd ${DIR}/../go/ && make -s DOCKER_IMAGE_NAME=cortex-api print-docker-image-name-tag)
LOKI_API_PROXY_IMAGE=$(cd ${DIR}/../go/ && make -s DOCKER_IMAGE_NAME=loki-api print-docker-image-name-tag)
DD_API_PROXY_IMAGE=$(cd ${DIR}/../go/ && make -s DOCKER_IMAGE_NAME=ddapi print-docker-image-name-tag)
CONFIG_API_PROXY_IMAGE=$(cd ${DIR}/../go/ && make -s DOCKER_IMAGE_NAME=config-api print-docker-image-name-tag)

echo "Check if api docker images exist"
docker pull ${CORTEX_API_PROXY_IMAGE} && docker pull ${LOKI_API_PROXY_IMAGE} && docker pull ${DD_API_PROXY_IMAGE} && docker pull ${CONFIG_API_PROXY_IMAGE}

if [ $? -ne 0 ];
then
	set -e

	echo "Building api proxy docker images"
	(cd ${DIR}/../go && make build-image)

	echo "Publishing api proxy docker images"
	(cd ${DIR}/../go && make publish)
fi

OPSTRACE_APP_IMAGE=$(cd ${DIR}/../packages/app/ && make -s DOCKER_IMAGE_NAME=app print-docker-image-name-tag)
OPSTRACE_GRAPHQL_IMAGE=$(cd ${DIR}/../packages/app/ && make -s DOCKER_IMAGE_NAME=graphql print-docker-image-name-tag)

echo "Check if app docker images exist"
docker pull ${OPSTRACE_APP_IMAGE} && docker pull ${OPSTRACE_GRAPHQL_IMAGE}

if [ $? -ne 0 ];
then
	set -e

	echo "Building app docker images"
	(cd ${DIR}/../packages/app && make build-image)

	echo "Publishing app docker images"
	(cd ${DIR}/../packages/app && make publish)
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

jqi '.ddApi = "'${DD_API_PROXY_IMAGE}'"' ${DIR}/../packages/controller-config/src/docker-images.json

jqi '.configApi = "'${CONFIG_API_PROXY_IMAGE}'"' ${DIR}/../packages/controller-config/src/docker-images.json

jqi '.app = "'${OPSTRACE_APP_IMAGE}'"' ${DIR}/../packages/controller-config/src/docker-images.json

jqi '.graphqlEngine = "'${OPSTRACE_GRAPHQL_IMAGE}'"' ${DIR}/../packages/controller-config/src/docker-images.json

echo "Updated docker images"
git --no-pager diff ${DIR}/../packages/controller-config/src/docker-images.json
