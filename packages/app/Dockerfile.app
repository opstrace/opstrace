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
# Copy over just the package.json files so we can benefit from caching the next few steps
# and only run them again if package.json or yarn.lock changed
COPY lib/utils/package.json /build/lib/utils/package.json
COPY lib/kubernetes/package.json /build/lib/kubernetes/package.json
COPY packages/buildinfo/package.json /build/packages/buildinfo/package.json
COPY packages/app/package.json /build/packages/app/package.json
# increase node's default mem limit to something much bigger than needed
ENV NODE_OPTIONS=--max_old_space_size=8192

WORKDIR /build/packages/app

# Install dependencies (incl build dependencies) and perform build.
# The timeout here sucks, but it's partially due to pulling in large packages like
# @material-ui/icons (16k+ files), which I'd love to change https://github.com/yarnpkg/yarn/issues/5540
RUN yarn --frozen-lockfile --network-timeout 1000000
# Copy over all files
COPY lib/utils /build/lib/utils/
COPY lib/kubernetes /build/lib/kubernetes/
COPY packages/buildinfo /build/packages/buildinfo/
# Build the utils library. Don't run tsc -b in the app directory because it'll perform a single CPU bound
# build and typecheck for everything. Instead, just build and typecheck the utils, and let our yarn build step in the app
# package do the rest, since it forks the typechecking for better parallelization
WORKDIR /build/lib/utils
RUN yarn run tsc -b
WORKDIR /build/packages/buildinfo
RUN yarn run tsc -b
WORKDIR /build/lib/kubernetes
RUN yarn run tsc -b


WORKDIR /build/packages/app
# temporarily move node_modules
RUN mv node_modules ../node_modules
# Copy over the needed parts of the app package
COPY packages/app /build/packages/app/
# move node_module back after we've copied everything else in
RUN mv ../node_modules node_modules

RUN ls -ahltr
RUN yarn build

# Second stage, copy bundled files across
FROM node:14.15.1-buster-slim AS prod-stage
# Copy over built app package
COPY --from=build-stage /build/packages/app/dist /build/packages/app/dist
COPY --from=build-stage /build/packages/app/build /build/packages/app/build

WORKDIR /build/packages/app
RUN ls -ahltr

EXPOSE 3001
# Expose lightship port for http checks
EXPOSE 9000
# if possible, maybe add a quick check here that 'confirms' that all required dependencies
# are there. Not sure how we can do that... in the meantime, we rely on e2e testing to catch any issues.
