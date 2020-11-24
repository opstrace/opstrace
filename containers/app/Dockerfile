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
# increase node's default mem limit to something much bigger than needed
ENV NODE_OPTIONS=--max_old_space_size=8192
# this also creates the dir if it does not exist
WORKDIR /build/packages/app

# install dependencies (incl build dependencies) and perform build
RUN yarn --frozen-lockfile
RUN yarn run tsc -b
RUN ls -ahltr

RUN yarn build

# Second stage, copy bundled files across
FROM node:14.15.1-buster-slim AS prod-stage
WORKDIR /build

# Copy the build (ui build) and dist (server build) folders from previous step.
COPY --from=build-stage /build/packages/app/dist ./packages/app/dist
COPY --from=build-stage /build/packages/app/build ./packages/app/build

WORKDIR /build/packages/app
RUN ls -ahltr
# if possible, maybe add a quick check here that 'confirms' that all required dependencies
# are there. Not sure how we can do that... in the meantime, we rely on e2e testing to catch any issues.
WORKDIR /build/packages/app/dist