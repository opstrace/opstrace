# Use current NodeJS LTS release. Derive from Debian Buster.
FROM --platform=linux/amd64 node:16-buster

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

# gcloud CLI, required to refresh kubeconfig credentials
RUN echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] http://packages.cloud.google.com/apt cloud-sdk main" | \
    tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
RUN curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | \
    apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -
RUN apt-get update && apt-get install -y -q --no-install-recommends google-cloud-sdk
RUN apt-get -y autoclean

RUN gcloud config set core/disable_usage_reporting true && \
    gcloud config set component_manager/disable_update_check true && \
    gcloud config set metrics/environment github_docker_image

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

WORKDIR /build/test/test-remote

RUN cat package.json tsconfig.json && echo /build: && ls -al /build/*
RUN yarn install --frozen-lockfile

# Build TS dependencies such as lib/kubernetes
RUN yarn tsc

# Install playwright with yarn w/o installing browser binaries. Then call
# `playwright/install.js` directly for installing browser binaries. This
# installer is known to not be perfectly robust and instead of yarn shelling
# out to `playwright/install.js` we want to be able to call it directly, can
# retry if desired. Also see https://github.com/yarnpkg/yarn/issues/7887
# https://github.com/microsoft/playwright/issues/581#issuecomment-585506945
# https://github.com/microsoft/playwright/issues/598#issuecomment-590151978
RUN PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 yarn add playwright --frozen-lockfile

# Put playwright executable into PATH.
ENV PATH=${PATH}:/build/node_modules/.bin

# Check if it's callable.
RUN playwright -h

# PLAYWRIGHT_BROWSERS_PATH=0 is needed for both browser installing and when
# running playwright.
# Note(JP): we only need to install chromium
ENV PLAYWRIGHT_BROWSERS_PATH=0
RUN playwright install chromium

# Needed by @opstrace/utils
COPY buildinfo.json /buildinfo.json

# Disable automatic NPM update check (would always show "npm update check
# failed").
ENV NO_UPDATE_NOTIFIER true

# To use this image mount a volume with tests you want to run in a directory
# under /build, example /build/test-remote, and run `yarn run mocha` in that
# directory.
CMD ["/bin/bash"]
