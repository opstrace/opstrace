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
RUN apt-get update && apt-get install -y -q --no-install-recommends \
    uuid-runtime rsync curl gnupg2 git make jq moreutils netcat-openbsd \
    build-essential gettext-base ca-certificates unzip less

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
ENV NODE_VERSION v14.15.4
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
ENV GOLANG_VERSION 1.16.2
RUN curl -fsSLO https://golang.org/dl/go${GOLANG_VERSION}.linux-amd64.tar.gz && \
    tar -xzf go${GOLANG_VERSION}.linux-amd64.tar.gz -C /usr/local/ && \
    rm -f go${GOLANG_VERSION}.linux-amd64.tar.gz

ENV GOPATH /go

ENV PATH /usr/local/go/bin:$GOPATH/bin:$PATH

# Set up golanglint-ci in the container image.
RUN curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | \
    sh -s -- -b /usr/local/bin v1.38.0

# Set up markdownlint in the container image so that we can lint right away! :)
RUN npm install -g markdownlint-cli@0.26.0

# Set up `addlicense` so that we can use that right away. Install it to
# /usr/local.
RUN (cd /tmp && GOPATH=/usr/local/ go get github.com/google/addlicense)
