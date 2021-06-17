#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

set -o pipefail

# check if docker-images.json has the required docker images set
CORTEX_API_PROXY_IMAGE=$(cd ${DIR}/../go/ && make -s DOCKER_IMAGE_NAME=cortex-api print-docker-image-name-tag)
LOKI_API_PROXY_IMAGE=$(cd ${DIR}/../go/ && make -s DOCKER_IMAGE_NAME=loki-api print-docker-image-name-tag)
DD_API_PROXY_IMAGE=$(cd ${DIR}/../go/ && make -s DOCKER_IMAGE_NAME=ddapi print-docker-image-name-tag)
CONFIG_API_PROXY_IMAGE=$(cd ${DIR}/../go/ && make -s DOCKER_IMAGE_NAME=config-api print-docker-image-name-tag)
OPSTRACE_APP_IMAGE=$(cd ${DIR}/../packages/app/ && make -s DOCKER_IMAGE_NAME=app print-docker-image-name-tag)
OPSTRACE_GRAPHQL_IMAGE=$(cd ${DIR}/../packages/app/ && make -s DOCKER_IMAGE_NAME=graphql print-docker-image-name-tag)

# wrapper function to edit json file inplace
jqi() {
	cat <<< "$(jq "$1" < "$2")" > "$2"
}

# update docker-images.json
DOCKER_IMAGES_JSON=${DIR}/../packages/controller-config/src/docker-images.json

jqi '.cortexApiProxy = "'${CORTEX_API_PROXY_IMAGE}'"' ${DOCKER_IMAGES_JSON}
jqi '.lokiApiProxy = "'${LOKI_API_PROXY_IMAGE}'"' ${DOCKER_IMAGES_JSON}
jqi '.ddApi = "'${DD_API_PROXY_IMAGE}'"' ${DOCKER_IMAGES_JSON}
jqi '.configApi = "'${CONFIG_API_PROXY_IMAGE}'"' ${DOCKER_IMAGES_JSON}
jqi '.app = "'${OPSTRACE_APP_IMAGE}'"' ${DOCKER_IMAGES_JSON}
jqi '.graphqlEngine = "'${OPSTRACE_GRAPHQL_IMAGE}'"' ${DOCKER_IMAGES_JSON}

echo "Please add a commit with the required changes to docker-images.json."
