# Use current NodeJS LTS release. Derive from Debian Buster.
FROM node:14-buster

# Set up dependencies for playwright/chromium
# See https://github.com/opstrace/opstrace/pull/182#issuecomment-747426156
RUN apt-get update && apt-get install -y -q --no-install-recommends \
    libnss3 libcups2 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
    libdbus-c++-1-0v5 libdrm2 libxkbcommon0 libxcomposite1 \
    libxdamage1 libxfixes3 libxrandr2 libgbm1 libgtk-3-0 \
    libasound2 libatspi2.0-0 libxshmfence1

# The test runner requires `kubectl`.
RUN curl -sSL -O https://storage.googleapis.com/kubernetes-release/release/v1.18.0/bin/linux/amd64/kubectl && \
    chmod +x ./kubectl && \
    mv ./kubectl /usr/bin

RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip -q awscliv2.zip && \
    ./aws/install && \
    rm awscliv2.zip

# Make the /build/test/test-remote directory in the container image be the NPM package dir
# for the `test-remote` package. Bake the NPM package dependencies into the container image
# by running `yarn install`, based on package.json and yarn lock file.
COPY package.json tsconfig.json /build/
COPY yarn.lock test/test-remote/package.json test/test-remote/tsconfig.json /build/test/test-remote/

# Copy opstrace libraries used by test-remote into the container:
# opstrace/kubernetes: used directly by test-remote
COPY lib/kubernetes/ /build/lib/kubernetes/
# opstrace/utils: used by opstrace/kubernetes
COPY lib/utils/ /build/lib/utils/
# opstrace/buildinfo: used by opstrace/kubernetes
COPY packages/buildinfo/ /build/packages/buildinfo/

WORKDIR /build/test/test-remote

# browserType.launch: Failed to launch chromium because executable doesn't
# exist at
# /var/lib/buildkite-agent/.cache/ms-playwright/chromium-833159/chrome-linux/chrome
# [2020-12-17T10:46:05Z] Try re-installing playwright with "npm install
# playwright"
# https://github.com/microsoft/playwright/pull/2192
ENV PLAYWRIGHT_BROWSERS_PATH=0

RUN cat package.json tsconfig.json && \
    echo /build: && ls -al /build/* && \
    yarn install --frozen-lockfile && \
    yarn add playwright --frozen-lockfile

# Disable automatic NPM update check (would always show "npm update check
# failed").
ENV NO_UPDATE_NOTIFIER true

# Add the folder where dependency binaries are installed to the containers PATH.
ENV PATH=${PATH}:/build/node_modules/.bin

# Sanity check that all dependencies/libraries are actually present before running tests
# Takes a few minutes so disabled by default
#RUN playwright -h && \
#    cd /build/test/test-remote && \
#    yarn tsc && \
#    yarn clean

# To use this image mount a volume with tests you want to run in a directory
# under /build, example /build/test-remote, and run `yarn run mocha` in that
# directory.

CMD ["/bin/bash"]
