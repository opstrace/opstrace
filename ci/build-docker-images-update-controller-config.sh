#!/bin/bash

# This is probably the absolute path to /ci in our rep
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

set -oux pipefail

echo "DIR: ${DIR}"
echo "pwd: $(pwd)"

# edit JSON file in place
jqi() {
  cat <<< "$(jq "$1" < "$2")" > "$2"
}

# These image tag generation technqiues are all based on traversing a directory
# tree and building hash over file contents. See corresponding Makefile(s).
CORTEX_API_PROXY_IMAGE=$(cd ${DIR}/../go/ && make -s DOCKER_IMAGE_NAME=cortex-api print-docker-image-name-tag)
LOKI_API_PROXY_IMAGE=$(cd ${DIR}/../go/ && make -s DOCKER_IMAGE_NAME=loki-api print-docker-image-name-tag)
DD_API_PROXY_IMAGE=$(cd ${DIR}/../go/ && make -s DOCKER_IMAGE_NAME=ddapi print-docker-image-name-tag)
CONFIG_API_PROXY_IMAGE=$(cd ${DIR}/../go/ && make -s DOCKER_IMAGE_NAME=config-api print-docker-image-name-tag)
OPSTRACE_APP_IMAGE=$(cd ${DIR}/../packages/app/ && make -s DOCKER_IMAGE_NAME=app print-docker-image-name-tag)
OPSTRACE_GRAPHQL_IMAGE=$(cd ${DIR}/../packages/app/ && make -s DOCKER_IMAGE_NAME=graphql print-docker-image-name-tag)

# Write a new version of docker-images.json super early in this 'script' so
# that the controller image build (which needs an updated version of this file)
# can happen concurrently.
DIJSON_PATH="${DIR}/../packages/controller-config/src/docker-images.json"
echo "Updating docker-images.json"
jqi '.cortexApiProxy = "'${CORTEX_API_PROXY_IMAGE}'"' "${DIJSON_PATH}"
jqi '.lokiApiProxy = "'${LOKI_API_PROXY_IMAGE}'"' "${DIJSON_PATH}"
jqi '.ddApi = "'${DD_API_PROXY_IMAGE}'"' "${DIJSON_PATH}"
jqi '.configApi = "'${CONFIG_API_PROXY_IMAGE}'"' "${DIJSON_PATH}"
jqi '.app = "'${OPSTRACE_APP_IMAGE}'"' "${DIJSON_PATH}"
jqi '.graphqlEngine = "'${OPSTRACE_GRAPHQL_IMAGE}'"' "${DIJSON_PATH}"

echo "Updated docker images, this is the diff:"
git --no-pager diff "${DIJSON_PATH}"

# signal to the other racers that docker-images.json got updated. Note(JP):
# it's probably better to make the docker-images.json in the repo to be
# obviously 'wrong', maybe filled with template variables. Maybe merge this
# with the set-build-info-constants main makefile target.
touch ${DIR}/docker_images_json_regenerated

echo "Check if Go-based / API docker images exist"
docker pull ${CORTEX_API_PROXY_IMAGE} && docker pull ${LOKI_API_PROXY_IMAGE} && docker pull ${DD_API_PROXY_IMAGE} && docker pull ${CONFIG_API_PROXY_IMAGE}
if [ $? -ne 0 ];
then
	set -e

	echo "Building api proxy docker images"
	(cd ${DIR}/../go && make build-image)

	echo "Publishing api proxy docker images"
	(cd ${DIR}/../go && make publish)
fi

echo "Check if UI app docker images exist"
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
