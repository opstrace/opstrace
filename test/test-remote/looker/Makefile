# Allow this to be overridden from the outside.
CHECKOUT_VERSION_STRING ?= $(shell git rev-parse --short HEAD)-dev

IMAGE_NAME = opstrace/looker:$(CHECKOUT_VERSION_STRING)

image:
	docker build -f Dockerfile . -t $(IMAGE_NAME)

publish:
	docker push $(IMAGE_NAME)
