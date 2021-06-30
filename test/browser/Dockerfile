FROM mcr.microsoft.com/playwright:v1.12.3-focal

RUN mkdir -p /build/test/browser/test-results
WORKDIR /build/test/browser

COPY package.json tsconfig.json /build/test/browser/

RUN yarn install

# Sanity check that all playwright runs
RUN yarn playwright test -h

COPY . /build/test/browser

CMD ["/bin/bash"]
