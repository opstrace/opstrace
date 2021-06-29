FROM --platform=linux/amd64 mcr.microsoft.com/playwright:v1.12.3-bionic

ENV DOCKER v14.15.4

RUN mkdir -p /build/test/browser/test-results
WORKDIR /build/test/browser

COPY package.json tsconfig.json /build/test/browser/

RUN yarn install

# Sanity check that all playwright runs
RUN yarn playwright test -h

COPY . /build/test/browser

CMD ["/bin/bash"]
