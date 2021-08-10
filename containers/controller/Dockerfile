# Use current NodeJS LTS release. Derive from Debian Buster.
FROM node:16.6.1-buster-slim AS build-stage

# Ref: https://medium.com/@ankit.wal/the-why-and-how-of-multi-stage-docker-build-with-typescript-example-bcadbce2686c
# First image build stage: set up dependencies (ignorantly), compile TS to JS

# Make build log have explicit confirmation of versions in use.
RUN node --version
RUN yarn --version

RUN mkdir /build
COPY tsconfig.json package.json yarn.lock /build/

# "If <src> is a directory, the entire contents of the directory are copied,
# including filesystem metadata. The directory itself is not copied, just its
# contents.""
RUN mkdir /build/lib && mkdir /build/packages
COPY lib/aws /build/lib/aws/
COPY lib/gcp /build/lib/gcp/
COPY lib/kubernetes /build/lib/kubernetes/
COPY lib/utils /build/lib/utils/
COPY packages/controller /build/packages/controller/
COPY packages/config /build/packages/config/
COPY packages/tenants /build/packages/tenants/
COPY packages/controller-config /build/packages/controller-config/

# Bake node_modules into the image at /build/packages/controller/node_modules
# Use `cd` instead of WORKDIR because WORKDIR might invalidate the layer cache.
RUN cd /build/packages/controller && yarn --frozen-lockfile

# Use `cd` instead of WORKDIR because WORKDIR might invalidate the layer cache.
# Call the build command because it contains more than just tsc -b
RUN cd /build/packages/controller && yarn build

# Note(JP): Unclear why, but this leaves behind
# 57M	./lib/kubernetes/node_modules/typescript
# which we do not want to copy over to prod-stage.
RUN rm -rf /build/lib/kubernetes/node_modules

# Second stage, lean image w/o build tooling and ideally w/o unnecessary deps.
FROM node:16.6.1-buster-slim AS prod-stage
WORKDIR /build
COPY tsconfig.json package.json yarn.lock /build/

# Copy the lib/ and packages/ dirs ignorantly from the previous stage, i.e.
# they contain our TS source files.
COPY --from=build-stage /build/packages ./packages
COPY --from=build-stage /build/lib ./lib
RUN cd /build && du -ha . | sort -r -h | head -n 50 || true

RUN yarn --frozen-lockfile --production
RUN cd /build && du -ha . | sort -r -h | head -n 50 || true

# Note(JP): this leaves behind
# 89M	./node_modules/googleapis/build/src
RUN rm -rf /build/node_modules/googleapis/build/src

# Note(JP): we run yarn in this layer and that creates a yarn cache
# which dominates the size of this image.
# 554M	./usr/local/share/.cache/yarn
RUN rm -rf /usr/local/share/.cache/yarn

RUN echo "biggest dirs"
RUN cd / && du -ha . | sort -r -h | head -n 50 || true

WORKDIR /build/packages/controller/build

# Copy the structured Opstrace buildinfo file into the container image to a
# well-known path where code tries to discover it. Do this very late in the
# container image build because it obviously is not cachable (is different for
# every build).
COPY buildinfo.json /buildinfo.json

# Verify that the controller is invocable.
RUN node ./cmd.js --help
