FROM node:14
RUN mkdir /build

# Build context is the `test/test-remote` directory in the repo. Pragmatically
# copy what's required (not entire dir). `yarn.lock` is actually the
# repo-global yarn.lock file at the root directory of the repo. Copy that to
# `test/test-remote/yarn.lock` right before building the image (symlink does
# not work, Docker would say `Forbidden path outside the build context:
# yarn.lock`). `make image` does that.
COPY tsconfig.json package.json yarn.lock /build/
COPY testutils /build/testutils
COPY loki-node-client-tools /build/loki-node-client-tools
COPY prom-node-client-tools /build/prom-node-client-tools

WORKDIR /build

# Bake dependencies into the image, based on package.json and yarn.lock.
RUN yarn install --frozen-lockfile

COPY logstream-gen /build/logstream-gen
RUN yarn run tsc tsconfig.json

# I tried for 45 minutes to set up a binary using the `bin` property in
# package.json and failed miserably and a combination of `yarn install`, `yarn
# install -force`, reading yarn docs forth and back, and blog posts. Then fell
# back to basic unix tools to do that manually: worked within 1 minute.
ENV PATH="/build:${PATH}"
RUN chmod ugo+x /build/_tscbuild/logstream-gen/index.js
RUN ln -s /build/_tscbuild/logstream-gen/index.js /build/looker

# See if that works (expect CLI invocation error)
RUN looker || exit 0
WORKDIR /rundir
CMD looker
