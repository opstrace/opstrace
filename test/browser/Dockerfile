FROM --platform=linux/amd64 mcr.microsoft.com/playwright:v1.12.2-focal

COPY . /build/test/browser

WORKDIR /build/test/browser

RUN yarn install

# Sanity check that all playwright runs
RUN yarn playwright test -h

CMD ["/bin/bash"]
