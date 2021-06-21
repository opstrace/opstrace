FROM node:14-slim
RUN mkdir /build

# Build context is the `test/test-remote` directory in the repo. Pragmatically
# copy what's required (not entire dir).
COPY package.json tsconfig.json /build/

# Use a dedicated package.json/tsconfig.json for the Docker image build
# These exclude things that are not used by looker
COPY yarn.lock test/test-remote/containers/looker/package.json test/test-remote/containers/looker/tsconfig.json /build/test/test-remote/

COPY test/test-remote/testutils /build/test/test-remote/testutils

WORKDIR /build/test/test-remote

# Bake dependencies into the image, based on package.json and yarn.lock.
RUN echo /build: && \
    ls -al /build/* && \
    yarn install --frozen-lockfile

COPY test/test-remote/looker /build/test/test-remote/looker
RUN yarn run tsc -b tsconfig.json

# I tried for 45 minutes to set up a binary using the `bin` property in
# package.json and failed miserably and a combination of `yarn install`, `yarn
# install -force`, reading yarn docs forth and back, and blog posts. Then fell
# back to basic unix tools to do that manually: worked within 1 minute.
ENV PATH="/build/test/test-remote:${PATH}"
RUN chmod ugo+x /build/test/test-remote/_tscbuild/looker/index.js
RUN ln -s /build/test/test-remote/_tscbuild/looker/index.js /build/test/test-remote/looker-cmd

# See if the looker path works
RUN looker-cmd -h
WORKDIR /rundir
CMD looker-cmd
