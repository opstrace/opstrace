# Use current NodeJS LTS release. Derive from Debian Buster.
FROM node:14.15.1-buster-slim AS build-stage

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
COPY lib/utils /build/lib/utils/
COPY packages/app /build/packages/app/

# this also creates the dir if it does not exist
WORKDIR /build/packages/app

# install dependencies (incl build dependencies) and perform build
RUN yarn --frozen-lockfile
RUN yarn run tsc -b
RUN ls -ahltr

RUN yarn build
RUN CI=true yarn test

# Second stage, lean image w/o build tooling and ideally w/o unnecessary deps.
FROM node:14.15.1-buster-slim AS prod-stage
COPY tsconfig.json package.json yarn.lock /build/
WORKDIR /build

# Copy the lib/ and packages/ dirs ignorantly from the previous stage, i.e.
# they contain our TS source files.
COPY --from=build-stage /build/packages/app ./packages/app
COPY --from=build-stage /build/lib ./lib

RUN cd /build && du -ha . | sort -r -h | head -n 50 || true
RUN yarn --frozen-lockfile --production
RUN cd /build && du -ha . | sort -r -h | head -n 50 || true

WORKDIR /build/packages/app
RUN ls -ahltr
# maybe add a quick check here that 'confirms' that all required dependencies
# are there? (`yarn test` was run in the previous stage only)
WORKDIR /build/packages/app/dist