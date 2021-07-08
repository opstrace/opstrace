# Opstrace browser testing

We use [Playwrigtht](https://playwright.dev/docs/intro) for our browser testing, and run them using the offical [Playwright Test](https://playwright.dev/docs/test-intro) runner.

## Prerequisites

- You'll need an Opstrace cluster running in CI mode, for example using [this config](https://github.com/opstrace/opstrace/blob/main/ci/cluster-config.yaml) - it sets up the Authentication differently allowing username/password logins rather than using a thirdparty authentication provider.

- Have followed the [Remote cluster development](https://github.com/opstrace/opstrace/blob/main/packages/app/README.md#remote-cluster-development) section of the App readme.

- Docker

- NodeJS & Yarn

## Install

Make sure you are in the `/test/browser` folder and then run the following:

`yarn install`

`npx playwright install`

Note: the second command installs the browser binaries which Playwright Test doesn't do, unlike the main Playwrite library which does.

## Running tests

### Locally

There are two ways to run the tests, one is locally in your dev machine directly against your CI Cluster, for this you'll need to specify as ENV VARS it's name and the cloud provider:

`OPSTRACE_CLUSTER_NAME=my-cli-cluster OPSTRACE_CLOUD_PROVIDER=aws yarn playwright test`

This runs the tests like they are run on CI, headless with minimal reporting output. For active development of tests we us a different Playwright config file that inherits from the one CI uses and changes a couple of things, like running browers in headed mode, nicer output etc...

`OPSTRACE_CLUSTER_NAME=my-cli-cluster OPSTRACE_CLOUD_PROVIDER=aws yarn playwright test --config playwright.dev.config.ts`

By default, the Opstrace instance's base URL is built like this:

```text
https://<instance_name>.opstrace.io
```

To override this, set the environment variable `OPSTRACE_INSTANCE_DNS_NAME`.
Then the base URL is built like this:

```text
https://<OPSTRACE_INSTANCE_DNS_NAME>
```


### Docker

To run the tests exactly as they are run in CI we can build the Docker image locally and run it directly against our CI Cluster.

To start simply build the image giving it a friendly tag:

`docker build . -t opstrace/browser-test:dev`

then to run this against your CI Cluster:

`docker run -it -e OPSTRACE_CLUSTER_NAME=my-cli-cluster -e OPSTRACE_CLOUD_PROVIDER=aws docker.io/opstrace/browser-test:dev yarn playwright test`

This is handy as sometimes you need to reproduce CI to resolve a failing test that frustratingly passes on a dev machine

## Suggested developer workflow

### Telepresence

When creating tests for new features we recommend using [Telepresense](https://github.com/opstrace/opstrace/blob/main/packages/app/README.md#remote-cluster-development). This will expose your local dev instance of the React app via your cloud hosted CI Cluster, so any uncommitted changes you make will be immediately available to anybody, including Playwright, using your CI Cluster.

### Local instance running

If for some reason you're unable to use Telepresence then you can override the HOST the tests are run against to have the Playwright Test runner execute against your local dev instance:

`OPSTRACE_CLUSTER_BASE_URL="http://localhost:3000" OPSTRACE_CLOUD_PROVIDER=dev yarn playwright test --project=Chromium --headed`

## How authentication works

For authentication we take use of [Advanced Fixtures](https://playwright.dev/docs/test-fixtures) for Workers. Each Playwright Worker initially goes through the login process and saves the authentication cookies that are created. The browser is then closed. Then our tests have a `beforeEach` filter that injects those saved cookies into the `Page` object essentially logging the test user in for the following test.

When running in `headed` mode you'll see this happening with a browser page opening, logging in then the window closing.

At the moment this doesn't happen automatically, we have to make sure we structure our tests to use the ``Worker Fixture` and then to run the `beforeEach` callback, here is a basic example:

```typescript
import { expect } from "@playwright/test";

// Note: this is not the playwright "test" object but one that has had the authentication worker fixture added to it
import { test } from "../fixtures/authenticated";
import { logUserIn } from "../utils/authentication";

test.describe("after auth0 authentication", () => {
  test.beforeEach(logUserIn);

  test("user should see homepage", async ({ page }) => {
    expect(await page.isVisible("text=Getting Started")).toBeTruthy();
  });
});
```
