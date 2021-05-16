#
# This Makefile is specifically for building and pushing this packages docker images
#
DOCKER_REPO ?= opstrace
# DOCKER_IMAGE_TAG is a md5sum of all the files (except hidden) in this package's
# directory. We use it to have a deterministic method to calculate a docker
# image tag and to only build and push a new image when changes have been made.
DOCKER_IMAGE_TAG ?= $(shell find . -type f -not -path "./node_modules/*" -not -path "./secrets/*" -not -path "./build/*" -not -path "./dist/*" -not -path "./.storybook/*" -not -name ".*" -not -name "*.md" -print0 | sort -z -d -f | xargs -0 cat | md5sum | cut -d' ' -f1)

all: build-image publish

.PHONY: build-image
build-image: build-image-app build-image-graphql

define get_docker_image_name
	$(DOCKER_REPO)/$(DOCKER_IMAGE_NAME):$(DOCKER_IMAGE_TAG)
endef

.PHONY: print-docker-image-name-tag
print-docker-image-name-tag:
	@echo $(call get_docker_image_name)

.PHONY: build-image-app
build-image-app: DOCKER_IMAGE_NAME = app
build-image-app:
	docker build -f Dockerfile.app ../../ -t $(call get_docker_image_name)

.PHONY: build-image-graphql
build-image-graphql: DOCKER_IMAGE_NAME = graphql
build-image-graphql:
	docker build -f Dockerfile.graphqlserver . -t $(call get_docker_image_name)

.PHONY: publish
publish: publish-app publish-graphql

define publish_docker_image
	docker push $(call get_docker_image_name)
endef

.PHONY: publish-app
publish-app: DOCKER_IMAGE_NAME = app
publish-app:
	$(call publish_docker_image)

.PHONY: publish-graphql
publish-graphql: DOCKER_IMAGE_NAME = graphql
publish-graphql:
	$(call publish_docker_image)

.PHONY: start-remote-dev
start-remote-dev:
	telepresence connect
	@echo "Removing annotation on opstrace-application deployment to prevent controller opposing the injected telepresence sidecar container"
	kubectl annotate deployment opstrace-application opstrace- --namespace application
	telepresence intercept opstrace-application --port 3001:http --namespace application --env-file .env.server.remote --workload opstrace-application
	@echo ""
	@echo "Congrats, ready to start developing locally! Remember to run make stop-remote-dev when you're done, to close telepresence down."

.PHONY: stop-remote-dev
stop-remote-dev:
	telepresence leave opstrace-application
	telepresence quit
	@echo ""
	@echo "Adding annotation back on opstrace-application deployment for controller to resume its management"
	kubectl annotate deployment opstrace-application opstrace=owned --namespace application