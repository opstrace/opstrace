# Version info for binaries
GIT_REVISION := $(shell git rev-parse --short HEAD)

IMAGE_PREFIX ?= opstrace
IMAGE_TAG ?= dev

DOCKERFILE = ./Dockerfile

all: build-image publish

build-image:
	docker build -t $(IMAGE_PREFIX)/systemlog-fluentd:$(GIT_REVISION)-$(IMAGE_TAG) .
publish:
	docker push $(IMAGE_PREFIX)/systemlog-fluentd:$(GIT_REVISION)-$(IMAGE_TAG)
