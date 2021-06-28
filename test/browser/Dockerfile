FROM --platform=linux/amd64 mcr.microsoft.com/playwright:v1.12.3-focal

RUN mkdir -p /build/test/browser
WORKDIR /build/test/browser

COPY package.json tsconfig.json /build/test/browser/

RUN yarn install

# Sanity check that all playwright runs
RUN yarn playwright test -h

COPY . /build/test/browser

CMD ["/bin/bash"]
