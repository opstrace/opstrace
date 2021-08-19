# Opstrace CI runs on Buildkite agents. These build agents run a slim Linux
# distribution and can run Docker containers. Anything run by CI is meant to be
# executed in a Docker container on one of the Buildkite agents. The image
# defined by this Dockerfile here is supposed to provide all dependencies
# required by opstrace CI. Specifically, `make ci-<TARGET>` is run by CI in
# a container started from this image.
# Note that the individual developer can also build and make use of this
# container image during development.
FROM debian:buster-slim

# - moreutils, for `chronic` and `ts`.
# - make, for running make targets in the container
# - git, for interacting with the current checkout.
# - gettext-base for envsubst
# - uuid-runtime for uuidgen used by ci_events
# - netcat for debugging
# - tree, because we love nature
RUN apt-get update && apt-get install -y -q --no-install-recommends \
    uuid-runtime rsync curl gnupg2 git make jq moreutils netcat-openbsd \
    build-essential gettext-base ca-certificates unzip less tree

RUN apt-get install hub -y
# gcloud CLI, for managing GCP
RUN echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] http://packages.cloud.google.com/apt cloud-sdk main" | \
    tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
RUN curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | \
    apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -
RUN apt-get update && apt-get install -y -q --no-install-recommends google-cloud-sdk
RUN apt-get -y autoclean

RUN gcloud config set core/disable_usage_reporting true && \
    gcloud config set component_manager/disable_update_check true && \
    gcloud config set metrics/environment github_docker_image

# Install kubectl, discover current stable version dynamically.
RUN KVERSION=$(curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt) && \
    echo "install kubectl ${KVERSION}" && \
    curl -LO https://storage.googleapis.com/kubernetes-release/release/${KVERSION}/bin/linux/amd64/kubectl
RUN chmod +x ./kubectl && mv ./kubectl /usr/local/bin/kubectl

# AWS CLI, for fetching data from S3. Mount this into the container: ~/.aws
# (the BK agent's home dir has AWS credentials set up for accessing our S3 BK
# bucket.)
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip -q awscliv2.zip && \
    ./aws/install && \
    rm awscliv2.zip

# - NodeJS and npm, for compiling and running opstrace CLI / controller
# - Install NodeJS via nvm, analogue to local dev setup
ENV NODE_VERSION v16.4.2
ENV NVM_DIR /nvm
RUN mkdir $NVM_DIR && git clone https://github.com/nvm-sh/nvm.git "${NVM_DIR}"
RUN cd "${NVM_DIR}" && git checkout v0.37.2
RUN . "${NVM_DIR}"/nvm.sh && nvm install "${NODE_VERSION}"

# Put `node` and `npm` into PATH, for subsequent RUN statements but also for
# all commands later on run in the container.
ENV NODE_PATH=$NVM_DIR/versions/node/$NODE_VERSION/lib/node_modules
ENV PATH=$NVM_DIR/versions/node/$NODE_VERSION/bin:$PATH

# Moving target for now, on purpose.
RUN npm install -g yarn

# Make build log have explicit confirmation of versions in use.
RUN node --version
RUN yarn --version

# Hackish, but simple and reliable method for making `node` and `npm`
# executable by any user while also making sure that their "global" state is
# not going to be modified (no write access).
RUN chmod -R o+rx "${NVM_DIR}"

# Set up the Docker binaries so that within the container we can manage
# containers running on the host with the `docker` CLI (the host's Docker
# socket is going to be mounted in).
RUN curl -fsSLO https://download.docker.com/linux/static/stable/x86_64/docker-19.03.14.tgz && \
    tar --strip-components=1 -xvzf docker-19.03.14.tgz -C /usr/local/bin && \
    rm -f docker-19.03.14.tgz

# Set up golang. Required to run golanglint-ci in the linter step.
ENV GOLANG_VERSION 1.17
RUN curl -fsSLO https://golang.org/dl/go${GOLANG_VERSION}.linux-amd64.tar.gz && \
    tar -xzf go${GOLANG_VERSION}.linux-amd64.tar.gz -C /usr/local/ && \
    rm -f go${GOLANG_VERSION}.linux-amd64.tar.gz

ENV GOPATH /go

ENV PATH /usr/local/go/bin:$GOPATH/bin:$PATH

# Set up golanglint-ci in the container image.
RUN curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | \
    sh -s -- -b /usr/local/bin v1.41.1

# Set up markdownlint in the container image so that we can lint right away! :)
RUN npm install -g markdownlint-cli@0.28.1
RUN npm install -g prettier@2.3.2

RUN markdownlint --version
RUN prettier --version

# Set up `addlicense` so that we can use that right away. Install it to
# /usr/local.
RUN (cd /tmp && GOPATH=/usr/local/ go get github.com/google/addlicense)

#RUN mkdir /tmp/yarninstall
COPY package.json yarn.lock /

# Register build args, set defaults. GID and UID are expected to be overridden
# in CI.
ARG CIUNAME=ciuser
ARG CIUID=1000
ARG CIGID=1000

# Switch user to the same user that is used when running the image.
# This is so that /node_modules is writable.
RUN mkdir /node_modules && chmod 777 /node_modules
RUN echo "set up user $CIUNAME / $CIUID in group $CIGID"
RUN groupadd -g $CIGID -o $CIUNAME
RUN useradd -m -u $CIUID -g $CIGID -o -s /bin/bash $CIUNAME
USER $CIUNAME

RUN cd / && yarn --frozen-lockfile
# check if this command works
RUN yarn wsrun -c lint

RUN echo "biggest dirs"
RUN cd / && du -ha . | sort -r -h | head -n 50 || true
# show which cache dir is really configured
RUN yarn cache dir
