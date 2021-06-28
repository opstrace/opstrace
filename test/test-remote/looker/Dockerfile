FROM node:14-slim
RUN mkdir /build
RUN mkdir /rundir
RUN mkdir /lookerbin

# Build context is the root directory in the repo. Pragmatically
# cherry-pick what's required to quickly build looker.
# Use a dedicated package.json/tsconfig.json for the Docker image build,
# only use the root's `yarn.lock`.

COPY yarn.lock /build
# Copy looker sources into the image. This creates
# /build/tsconfig.json and /build/package.json
COPY ./package.json /build
COPY ./tsconfig.json /build
WORKDIR /build

# Bake dependencies into the image, based on /build/looker/package.json and
# /build/yarn.lock.
RUN echo /build: && \
    ls -al /build/* && \
    yarn install --global --frozen-lockfile

# Now copy in all other source files. And build
# Could remove `tsc` after that to reduce imagesize (use layers)
COPY . /build
# Alternative to `tree`, kudos to
# https://stackoverflow.com/a/61073579/145400
RUN find . | grep -v node_modules | sed -e "s/[^-][^\/]*\// |/g" -e "s/|\([^ ]\)/|-\1/"
RUN yarn run tsc -b tsconfig.json

#RUN echo "contents of _tscbuild:"

# But 'executable' into PATH.
ENV PATH="/lookerbin:${PATH}"
RUN chmod ugo+x /build/_tscbuild/index.js
RUN ln -s /build/_tscbuild/index.js /lookerbin/looker

# See if the looker path works (to fail the build if this does not).
RUN looker -h

WORKDIR /rundir
CMD looker
