
# Allow this to be overridden from the outside.
CHECKOUT_VERSION_STRING ?= $(shell git rev-parse --short HEAD)-dev

LOOKER_IMAGE_NAME = opstrace/looker:$(CHECKOUT_VERSION_STRING)
REPO_ROOT = ../../../..

image:
	docker build -f looker.Dockerfile $(REPO_ROOT) -t $(LOOKER_IMAGE_NAME)

publish:
	docker push $(LOOKER_IMAGE_NAME)

publish-as-latest:
	docker build -f looker.Dockerfile $(REPO_ROOT) -t opstrace/looker:latest
	docker push opstrace/looker:latest
