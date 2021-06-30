#!/bin/bash

make rebuild-ci-container-image
# testrunner run tsc which requires buildinfo package to be set
make set-build-info-constants
make rebuild-testrunner-container-images
make rebuild-looker-container-image
