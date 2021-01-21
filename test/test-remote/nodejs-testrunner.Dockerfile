# Use current NodeJS LTS release. Derive from Debian Buster.
FROM node:14-buster

# Set up dependencies for playwright/chromium
# See https://github.com/opstrace/opstrace/pull/182#issuecomment-747426156
RUN apt-get update && apt-get install -y -q --no-install-recommends \
    libnss3 libcups2 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
    libdbus-c++-1-0v5 libdrm2 libxkbcommon0 libxcomposite1 \
    libxdamage1 libxfixes3 libxrandr2 libgbm1 libgtk-3-0 libgtk-3-0 \
    libasound2 libatspi2.0-0 libxshmfence

# The test runner requires `kubectl`.
RUN curl -sSL -O https://storage.googleapis.com/kubernetes-release/release/v1.18.0/bin/linux/amd64/kubectl && \
    chmod +x ./kubectl && \
    mv ./kubectl /usr/bin

RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip -q awscliv2.zip && \
    ./aws/install && \
    rm awscliv2.zip

# Make the /test directory in the container image be the NPM package dir for
# the `test-remote` package. Bake the NPM package dependencies into the
# container image (by running `yarn install`), based on package.json and
# yarn lock file (the latter is expected to be copied from repo root).
RUN mkdir /test
COPY ./package.json /test/package.json
COPY ./yarn.lock /test/yarn.lock

WORKDIR /test
RUN cat package.json

RUN yarn install --frozen-lockfile

# browserType.launch: Failed to launch chromium because executable doesn't
# exist at
# /var/lib/buildkite-agent/.cache/ms-playwright/chromium-833159/chrome-linux/chrome
# [2020-12-17T10:46:05Z] Try re-installing playwright with "npm install
# playwright"
# https://github.com/microsoft/playwright/pull/2192
ENV PLAYWRIGHT_BROWSERS_PATH=0
RUN yarn add playwright --frozen-lockfile

# Disable automatic NPM update check (would always show "npm update check
# failed").
ENV NO_UPDATE_NOTIFIER true

# Three steps for running the test runner in the container using the *current*
# test runner code (including local, uncommitted modifications).
# 1) Mount the current test runner code checkout to /test-remote in the
#    container. Example:
#
#       /home/<...>/opstrace/test/test-remote --> /test-remote
#
# 2) In the container copy /test-remote/* to /test (including dotfiles, do not
#    overwrite upon conflict).
#
# 3) `cd /test`, and invoke `npm run mocha` there.

# Simple workaround for the above step 2 (copy) to work as non-root.
RUN chmod og+rwx /test
RUN chmod -R og+rw /test

CMD ["/bin/bash"]
