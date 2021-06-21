FROM node:14-slim
RUN mkdir /build
RUN mkdir /lookerbin

# Build context is the root directory in the repo. Pragmatically
# cherry-pick what's required to quickly build looker.
# Use a dedicated package.json/tsconfig.json for the Docker image build,
# only use the root's `yarn.lock`.

COPY yarn.lock /build
COPY test/test-remote/containers/looker/package.json /build
COPY test/test-remote/containers/looker/tsconfig.json /build
COPY test/test-remote/testutils /build/testutils
WORKDIR /build/

# Bake dependencies into the image, based on /build/looker/package.json and /build/looker/yarn.lock.
RUN echo /build: && \
    ls -al /build/* && \
    yarn install --global --frozen-lockfile

# Copy looker sources into the image and build
COPY test/test-remote/looker /build/looker
RUN yarn run tsc -b tsconfig.json

# Alternative to `tree`, kudos to
# https://stackoverflow.com/a/61073579/145400
RUN echo "contents of _tscbuild:"
RUN find _tscbuild | sed -e "s/[^-][^\/]*\// |/g" -e "s/|\([^ ]\)/|-\1/"

# I tried for 45 minutes to set up a binary using the `bin` property in
# package.json and failed miserably and a combination of `yarn install`, `yarn
# install -force`, reading yarn docs forth and back, and blog posts. Then fell
# back to basic unix tools to do that manually: worked within 1 minute.
ENV PATH="/lookerbin:${PATH}"
RUN chmod ugo+x /build/_tscbuild/looker/index.js
RUN ln -s /build/_tscbuild/looker/index.js /lookerbin/looker

# See if the looker path works
RUN looker -h
WORKDIR /rundir
CMD looker
