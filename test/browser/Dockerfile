FROM mcr.microsoft.com/playwright:v1.13.0-focal

RUN mkdir -p /build/test/browser/test-results
WORKDIR /build/test/browser

COPY package.json tsconfig.json /build/test/browser/

RUN yarn install

# Sanity check that all playwright runs
RUN yarn playwright test -h

COPY . /build/test/browser

# add a random string to the begining of each spec filename so that they run in a random order each time
# this doesn't change the order tests in each spec run
WORKDIR /build/test/browser/tests
RUN for i in *.spec.ts; do mv "$i" `cat /dev/random | tr -dc 'a-zA-Z0-9' | fold -w 5 | head -n 1`_"$i"; done

WORKDIR /build/test/browser

CMD ["/bin/bash"]
