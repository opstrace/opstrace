
# Allow this to be overridden from the outside.
CHECKOUT_VERSION_STRING ?= $(shell git rev-parse --short HEAD)-dev

LOOKER_IMAGE_NAME = opstrace/looker:$(CHECKOUT_VERSION_STRING)


image:
	# temporarily pull repo-global yarn lock file into test/test-remote, see
	# comment in looker.Dockerfile
	cp -n ../../../../yarn.lock ../../
	docker build -f looker.Dockerfile ../.. -t $(LOOKER_IMAGE_NAME)
	rm -f ../../yarn.lock

publish:
	docker push $(LOOKER_IMAGE_NAME)

publish-as-latest:
	docker build -f looker.Dockerfile ../.. -t opstrace/looker:latest
	docker push opstrace/looker:latest