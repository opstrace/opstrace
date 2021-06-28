# Allow this to be overridden from the outside.
CHECKOUT_VERSION_STRING ?= $(shell git rev-parse --short HEAD)-dev

IMAGE_NAME = opstrace/looker:$(CHECKOUT_VERSION_STRING)

image:
	# temporarily pull repo-global yarn lock file into this dir so
	# that `yarn install` in there respects that (repo root not part of build
	# context, this speeds up the image build quite a bit for me).
	cp -n ../../../yarn.lock .
	docker build -f Dockerfile . -t $(IMAGE_NAME)
	rm -f yarn.lock

publish:
	docker push $(IMAGE_NAME)
