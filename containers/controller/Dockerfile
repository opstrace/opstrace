# Use current NodeJS LTS release. Derive from Debian Buster.
FROM node:16.4.2-buster-slim AS build-stage

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

WORKDIR /build/packages/controller

# Note(JP): It's important to make use of the image layer cache after RUN yarn
# --frozen-lockfile. Therefore, copy `packages/buildinfo` _before_ yarn package
# installation is not a good thing to do.
COPY packages/buildinfo /build/packages/buildinfo/

ENV NODE_OPTIONS "--max-old-space-size=1536"
RUN yarn --frozen-lockfile



# NTW: [2021.03.04] Yarn seems to have stopped recursively building our packages for some currently
# unknown reason, doing this manually in this precise order is required for `yarn tsc -b` to work when
# building the Controller

WORKDIR /build/packages/buildinfo
RUN yarn build
WORKDIR /build/lib/utils
RUN yarn build
WORKDIR /build/lib/kubernetes
RUN yarn build
WORKDIR /build/packages/tenants
RUN yarn build
WORKDIR /build/lib/gcp
RUN yarn build
WORKDIR /build/packages/config
RUN yarn build
WORKDIR /build/lib/aws
RUN yarn build
WORKDIR /build/packages/controller-config
RUN yarn build

WORKDIR /build/packages/controller

# Call the build command because it contains more than just tsc -b
RUN yarn build

# Second stage, lean image w/o build tooling and ideally w/o unnecessary deps.
FROM node:14.15.1-buster-slim AS prod-stage
WORKDIR /build
COPY tsconfig.json package.json yarn.lock /build/

# Copy the lib/ and packages/ dirs ignorantly from the previous stage, i.e.
# they contain our TS source files.
COPY --from=build-stage /build/packages ./packages
COPY --from=build-stage /build/lib ./lib
RUN cd /build && du -ha . | sort -r -h | head -n 50 || true

RUN yarn --frozen-lockfile --production
RUN cd /build && du -ha . | sort -r -h | head -n 50 || true

WORKDIR /build/packages/controller/build

# Verify that the controller is invocable.
RUN node ./cmd.js --help
