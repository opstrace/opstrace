FROM node:14-alpine AS stage-tsc-build

# Installation of `snappy` uses `node-gyp` to build binaries, and that
# needs Python. Also see https://github.com/nodejs/docker-node/issues/282.
# This is not used in the 'production' layer below. #make g++
RUN apk add --no-cache --virtual .gyp python make g++

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


# Another stage to do `yarn install --production` which requires some build
# tooling that should not be in the final image.
FROM node:14-alpine AS stage-yarn-install-prod

# For `snappy` /`node-gyp`
RUN apk add --no-cache --virtual .gyp python make g++
WORKDIR /build
COPY tsconfig.json package.json /build/
RUN yarn install --production

# https://github.com/yarnpkg/yarn/issues/749#issuecomment-575470428
# This saves like 150 MB.
#RUN yarn cache clean



# Third stage, copying node_modules from `stage-yarn-install-prod` and
# tsc build outcome from `stage-tsc-build
FROM node:14-alpine AS stage-prod

COPY --from=stage-tsc-build /build/_tscbuild /build/_tscbuild
COPY --from=stage-yarn-install-prod /build/node_modules /build/node_modules


#RUN cd /build && du -ha . | sort -r -h | head -n 50 || true


# This saves another 45 MB
RUN rm -rf /usr/local/lib/node_modules/npm

# But 'executable' into PATH.
RUN mkdir /lookerbin
RUN mkdir /rundir
ENV PATH="/lookerbin:${PATH}"
RUN chmod ugo+x /build/_tscbuild/index.js
RUN ln -s /build/_tscbuild/index.js /lookerbin/looker

RUN echo "directory sizes for /"
RUN cd / && du -a . | sort -rn  | head -n 50 || true

#RUN echo "directory sizes for /usr"
#RUN cd /usr && du -ha . | sort -r -h | head -n 50 || true
#RUN cd node_modules && du -hs *

# See if the looker path works (to fail the build if this does not).
RUN looker -h

WORKDIR /rundir
CMD looker
