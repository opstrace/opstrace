# Version info for binaries
GIT_REVISION := $(shell git rev-parse --short HEAD)

DOCKER_REPO ?= opstrace
# DOCKER_IMAGE_TAG is a md5sum of all the files (except hidden) in the go
# directory. We use it to have a deterministic method to calculate a docker
# image tag.
DOCKER_IMAGE_TAG ?= $(shell find . -type f -not -name ".*" -print0 | sort -z -d -f | xargs -0 cat | md5sum | cut -d' ' -f1)

DOCKERFILE = ./Dockerfile

all: build-image publish

export GO111MODULE=on
export GOPRIVATE=github.com/opstrace

.PHONY: clean
clean: clean-cortex clean-loki clean-ddapi

.PHONY: clean-cortex
clean-cortex:
	rm -f cortex-api

.PHONY: clean-loki
clean-loki:
	rm -f loki-api

.PHONY: clean-ddapi
clean-ddapi:
	rm -f ddapi

.PHONY: build-image
build-image: build-image-cortex build-image-loki build-image-ddapi

define get_docker_image_name
	$(DOCKER_REPO)/$(DOCKER_IMAGE_NAME):$(DOCKER_IMAGE_TAG)
endef

.PHONY: print-docker-image-name-tag
print-docker-image-name-tag:
	@echo $(call get_docker_image_name)

# Function to build a docker image. Parameters are passed via
# Makefile variables.
define build_docker_image
	docker build -f $(DOCKERFILE) . -t $(call get_docker_image_name)
endef

.PHONY: build-image-cortex
build-image-cortex: DOCKERFILE = Dockerfile.cortex
build-image-cortex: DOCKER_IMAGE_NAME = cortex-api
build-image-cortex:
	$(call build_docker_image)

.PHONY: build-image-loki
build-image-loki: DOCKERFILE = Dockerfile.loki
build-image-loki: DOCKER_IMAGE_NAME = loki-api
build-image-loki:
	$(call build_docker_image)

.PHONY: build-image-ddapi
build-image-ddapi: DOCKERFILE = Dockerfile.ddapi
build-image-ddapi: DOCKER_IMAGE_NAME = ddapi
build-image-ddapi:
	$(call build_docker_image)

.PHONY: publish
publish: publish-cortex publish-loki publish-ddapi

define publish_docker_image
	docker push $(call get_docker_image_name)
endef

.PHONY: publish-cortex
publish-cortex: DOCKER_IMAGE_NAME = cortex-api
publish-cortex:
	$(call publish_docker_image)

.PHONY: publish-loki
publish-loki: DOCKER_IMAGE_NAME = loki-api
publish-loki:
	$(call publish_docker_image)

.PHONY: publish-ddapi
publish-ddapi: DOCKER_IMAGE_NAME = ddapi
publish-ddapi:
	$(call publish_docker_image)

.PHONY: build
build: build-cortex build-loki build-ddapi

.PHONY: build-cortex
build-cortex: cortex-api

cortex-api:
	go build -o cortex-api ./cmd/cortex/main.go

.PHONY: build-loki
build-loki: loki-api

loki-api:
	go build -o loki-api ./cmd/loki/main.go

.PHONY: build-ddapi
build-ddapi: ddapi

ddapi:
	go build -o ddapi ./cmd/ddapi/ddapi.go


.PHONY: unit-tests
unit-tests:
	# Let's see if the Docker daemon of the bk host is available
	#docker info
	#docker version
	#echo -e "GET /v1.39/images/json HTTP/1.0\r\n" | nc -U /var/run/docker.sock
	# Force a less mordern Docker Engine API version that the client supports,
	# knowing (assuming) that the Docker daemon that we work against here is
	# Docker CE 19.x
	#DOCKER_HOST=unix:///var/run/docker.sock DOCKER_TLS_VERIFY=0
	go test -v ./...


