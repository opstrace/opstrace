FROM node:14-slim AS build-stage

# Copy just what's needed to install packages with yarn (invalidate this cache
# layer only when one of these files change). For now, do not use a yarn.lock
# file: had the challenge to use repo-wide yarn.lock file during the rather
# independent build, and with --frozen-lockfile the install then failed with
# a gazillion of _removals_ from yarn.lock
RUN mkdir /build
COPY tsconfig.json package.json /build/
WORKDIR /build

RUN echo /build: && ls -al /build/* && yarn install


# Now copy in all other source files. And build
# Could remove `tsc` after that to reduce imagesize (use layers)
COPY . /build
# Alternative to `tree`, kudos to
# https://stackoverflow.com/a/61073579/145400
RUN find . | grep -v node_modules | sed -e "s/[^-][^\/]*\// |/g" -e "s/|\([^ ]\)/|-\1/"
RUN yarn run tsc -b tsconfig.json


# Second stage, lean image w/o build tooling.
FROM node:14-slim AS prod-stage
WORKDIR /build
COPY tsconfig.json package.json /build/
RUN yarn install --production

# Copy the _tscbuild output directory from the previous build stage.
COPY --from=build-stage /build/_tscbuild /build/_tscbuild
#RUN cd /build && du -ha . | sort -r -h | head -n 50 || true

# But 'executable' into PATH.
RUN mkdir /lookerbin
RUN mkdir /rundir
ENV PATH="/lookerbin:${PATH}"
RUN chmod ugo+x /build/_tscbuild/index.js
RUN ln -s /build/_tscbuild/index.js /lookerbin/looker

#RUN du -hs *
#RUN cd node_modules && du -hs *

# See if the looker path works (to fail the build if this does not).
RUN looker -h

WORKDIR /rundir
CMD looker
