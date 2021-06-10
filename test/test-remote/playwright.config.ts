import { PlaywrightTestConfig } from "@playwright/test";

const DEBUG_MODE = process.env.OPSTRACE_PLAYWRIGHT_DEBUG === "true";

const config: PlaywrightTestConfig = {
  use: {
    headless: !DEBUG_MODE, // to see browser on your desktop set to false or set the ENV VAR "OPSTRACE_PLAYWRIGHT_DEBUG=true"
    args: [
      // https://github.com/microsoft/playwright/blob/761bd78879c83ed810ae38ef39513b2d874badb1/docs/ci.md#docker
      "--disable-dev-shm-usage",
      // https://github.com/microsoft/playwright/issues/4761
      "--disable-gpu"
    ],

    slowMo: 500,

    // Context options
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,

    // Artifacts
    screenshot: "only-on-failure",
    video: "retry-with-video"
  }
};

export default config;
