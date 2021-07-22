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
# Copy over just the package.json files so we can benefit from caching the next
# few steps and only run them again if package.json or yarn.lock changed
COPY lib/utils/package.json /build/lib/utils/package.json
COPY lib/kubernetes/package.json /build/lib/kubernetes/package.json
COPY packages/app/package.json /build/packages/app/package.json
# increase node's default mem limit to something much bigger than needed
ENV NODE_OPTIONS=--max_old_space_size=8192

WORKDIR /build/packages/app

# Install dependencies (incl build dependencies) and perform build.
# The timeout here sucks, but it's partially due to pulling in large packages like
# @material-ui/icons (16k+ files), which I'd love to change https://github.com/yarnpkg/yarn/issues/5540
RUN yarn --frozen-lockfile --network-timeout 1000000

# lib/utils and lib/kubernetes: copy TS source files and build
COPY lib/utils /build/lib/utils/
RUN cd /build/lib/utils && yarn run tsc -b

COPY lib/kubernetes /build/lib/kubernetes/
RUN cd /build/lib/kubernetes && yarn run tsc -b


WORKDIR /build/packages/app
# temporarily move node_modules
RUN mv node_modules ../node_modules
# Copy over the needed parts of the app ackage
COPY packages/app /build/packages/app/
# move node_module back after we've copied everything else in
RUN mv ../node_modules node_modules

RUN ls -ahltr
RUN yarn build

# Second stage, copy bundled files across
FROM node:16.4.2-buster-slim AS prod-stage
# Copy over built app package
COPY --from=build-stage /build/packages/app/dist /build/packages/app/dist
COPY --from=build-stage /build/packages/app/build /build/packages/app/build

WORKDIR /build/packages/app
RUN ls -ahltr

# Copy the structured Opstrace buildinfo file into the container image to a
# well-known path where code tries to discover it. Do this very late in the
# container image build because it obviously is not cachable (is different for
# every build).
COPY buildinfo.json /buildinfo.json

EXPOSE 3001
# Expose lightship port for http checks
EXPOSE 9000
# if possible, maybe add a quick check here that 'confirms' that all required dependencies
# are there. Not sure how we can do that... in the meantime, we rely on e2e testing to catch any issues.
