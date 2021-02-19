/**
 * Copyright 2020 Opstrace, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import events from "events";
import fs from "fs";
import { strict as assert } from "assert";

import Docker from "dockerode";
import { ZonedDateTime } from "@js-joda/core";
import got from "got";

import {
  log,
  rndstring,
  logHTTPResponse,
  httpTimeoutSettings,
  TENANT_DEFAULT_DD_API_BASE_URL,
  TENANT_DEFAULT_CORTEX_API_BASE_URL,
  TENANT_DEFAULT_API_TOKEN_FILEPATH,
  globalTestSuiteSetupOnce,
  readDockerDNSSettings,
  createTempfile,
  mtimeDeadlineInSeconds,
  mtime,
  //mtimeDiffSeconds,
  sleep,
  readFirstNBytes
} from "./testutils";

import { waitForCortexQueryResult } from "./test_prom_remote_write";

function ddApiSeriesUrl() {
  let url = `${TENANT_DEFAULT_DD_API_BASE_URL}/api/v1/series`;
  if (TENANT_DEFAULT_API_TOKEN_FILEPATH !== undefined) {
    const token = fs.readFileSync(TENANT_DEFAULT_API_TOKEN_FILEPATH, {
      encoding: "utf8"
    });
    url = `${url}?api_key=${token}`;
  }
  return url;
}

function copyLEcertToHost() {
  const src = `${__dirname}/containers/fakelerootx1.pem`;
  const dst = createTempfile("le-staging-root-ca", ".pem");
  log.info("copy %s to %s", src, dst);
  fs.copyFileSync(src, dst);
  return dst;
}

export async function startDDagentContainer() {
  log.info("start containerized DD agent");
  const docker = new Docker({ socketPath: "/var/run/docker.sock" });

  const dockerDNS = readDockerDNSSettings();
  log.info(`docker container dns settings: ${dockerDNS}`);

  // Prepare for mounting Let's Encrypt Staging root CA into the DD agent
  // container (the goal is that the Golang-based HTTP client used in the DD
  // agent discovers it when doing HTTP requests). Note: the path
  // `${__dirname}/containers/fakelerootx1.pem` is valid _in the container_
  // running the test runner, but not on the host running the test runner
  // container. For being able to mount this file into the DD agent container,
  // first copy it to a location that's known to be shared between the test
  // runner container and the host.
  const leStagingRootCAFilePathOnHost = copyLEcertToHost();

  // Use magic DD agent environment variables to point the DD agent to
  // the tested cluster's DD API implementation. Set the 'default' tenant's
  // API authentication token as DD API key. The environnment variables
  // supported by the DD agent are documented here:
  // https://docs.datadoghq.com/agent/guide/environment-variables/
  let ddApiKey = "none";
  if (TENANT_DEFAULT_API_TOKEN_FILEPATH !== undefined) {
    ddApiKey = fs.readFileSync(TENANT_DEFAULT_API_TOKEN_FILEPATH, {
      encoding: "utf8"
    });
  }
  const ddEnv = [
    `DD_API_KEY=${ddApiKey}`,
    `DD_DD_URL=${TENANT_DEFAULT_DD_API_BASE_URL}`
  ];

  log.info("DD agent container env: %s", ddEnv);

  // Prepare file for capturing DD agent stdout/err.
  const outerrfilePath = createTempfile("dd-agent-container-", ".outerr");
  const outstream = fs.createWriteStream(outerrfilePath);
  await events.once(outstream, "open");

  const cont = await docker.createContainer({
    Image: "gcr.io/datadoghq/agent:7",
    AttachStdin: false,
    AttachStdout: false,
    AttachStderr: false,
    Tty: false,
    Env: ddEnv,
    HostConfig: {
      Mounts: [
        {
          Type: "bind",
          Source: leStagingRootCAFilePathOnHost,
          // /etc/ssl/ca-bundle.pem is a place where the Golang-based HTTP
          // client in the DD agent discovers and uses the CA file  when doing
          // HTTP requests. It does however not overwrite the system store
          // baked into the container image, because that path is not used by
          // the distro in the DD agent container image. Kudos to
          // https://stackoverflow.com/a/40051432/145400 for showing the paths
          // that Golang walks through.
          Target: "/etc/ssl/ca-bundle.pem",
          ReadOnly: true
        },
        {
          Type: "bind",
          Source: "/var/run/docker.sock",
          Target: "/var/run/docker.sock",
          ReadOnly: true
        },
        {
          Type: "bind",
          Source: "/proc/",
          Target: "/host/proc/",
          ReadOnly: true
        },
        {
          Type: "bind",
          Source: "/sys/fs/cgroup/",
          Target: "/host/sys/fs/cgroup",
          ReadOnly: true
        },
        {
          Type: "bind",
          Source: "/tmp",
          Target: "/tmp",
          ReadOnly: false
        }
      ],
      Dns: readDockerDNSSettings()
    }
  });

  log.info("attach file-backed stream");
  const stream = await cont.attach({
    stream: true,
    stdout: true,
    stderr: true
  });
  stream.pipe(outstream);

  log.info("container start()");
  await cont.start();

  // Expect a special log messaged emitted by the DD agent to confirm that time
  // series fragments were successfully POSTed (2xx-acked) to the Opstrace
  // cluster's DD API implementation.
  const logNeedle = `Successfully posted payload to "${TENANT_DEFAULT_DD_API_BASE_URL}/api/v1/series`;

  // It's known that this may take a while after DD agent startup.
  // Note: also see https://github.com/opstrace/opstrace/issues/384
  const maxWaitSeconds = 120;
  const deadline = mtimeDeadlineInSeconds(maxWaitSeconds);
  log.info(
    "Waiting for needle to appear in container log, deadline in %s s. Needle: %s",
    maxWaitSeconds,
    logNeedle
  );

  async function terminateContainer() {
    log.info("terminate container");

    try {
      await cont.kill({ signal: "SIGTERM" });
    } catch (err) {
      log.warning("could not kill container: %s", err.message);
    }

    log.info("wait for container to stop");
    try {
      await cont.wait();
    } catch (err) {
      log.warning("error waiting for container: %s", err.message);
    }

    log.info("force-remove container");
    try {
      await cont.remove({ force: true });
    } catch (err) {
      log.warning("could not remove container: %s", err.message);
    }
    log.info(
      "log output emitted by container (stdout/err from %s):\n%s",
      outerrfilePath,
      fs.readFileSync(outerrfilePath, {
        encoding: "utf-8"
      })
    );
  }

  while (true) {
    if (mtime() > deadline) {
      log.info("deadline hit");
      await terminateContainer();
      throw new Error(
        "DD agent container setup failed: deadline hit waiting for log needle"
      );
    }
    const fileHeadBytes = await readFirstNBytes(outerrfilePath, 10 ** 5);
    if (fileHeadBytes.includes(Buffer.from(logNeedle, "utf-8"))) {
      log.info("log needle found in container log, proceed");
      break;
    }
    await sleep(0.2);
  }

  return terminateContainer;
}

suite("DD API test suite", function () {
  suiteSetup(async function () {
    log.info("suite setup");
    globalTestSuiteSetupOnce();
  });

  suiteTeardown(async function () {
    // Note: this does not seem to be run upon Node shutdown, e.g. triggered
    // with SIGINT. Make cleanup better.
    log.info("suite teardown");
  });

  test("dd_api_insert_single_ts_fragment", async function () {
    const rndstr = rndstring(5);
    const metricname = `opstrace.dd.test-remote-${rndstr}`;
    const metricnameSanitized = `opstrace_dd_test_remote_${rndstr}`;

    const now = ZonedDateTime.now();
    const tsnow = now.toEpochSecond();

    const payload = {
      series: [
        {
          metric: metricname,
          // Note: these samples are descending in time, which is
          // the order that the DD agent sends fragments with. This order
          // is currently strictly required by the receiving end.
          points: [
            [tsnow, 2],
            [tsnow - 120, 1],
            [tsnow - 240, 0]
          ],
          tags: ["version:7.24.1", "testtag:testvalue"],
          host: "somehost",
          type: "rate",
          interval: 5
        }
      ]
    };

    log.info("POST body doc:\n%s", JSON.stringify(payload, null, 2));
    const payloadBytes = Buffer.from(JSON.stringify(payload), "utf-8");

    const headers = {
      "Content-Type": "application/json"
    };
    const response = await got.post(ddApiSeriesUrl(), {
      body: payloadBytes,
      throwHttpErrors: false,
      headers: headers,
      timeout: httpTimeoutSettings,
      https: { rejectUnauthorized: false }
    });
    logHTTPResponse(response);

    // now query cortex
    const searchStart = now.minusMinutes(45);
    const searchEnd = now.plusMinutes(10);

    const queryParams = {
      query: `${metricnameSanitized}{job="ddagent"}`,
      start: searchStart.toEpochSecond().toString(),
      end: searchEnd.toEpochSecond().toString(),
      step: "60s"
    };

    const resultArray = await waitForCortexQueryResult(
      TENANT_DEFAULT_CORTEX_API_BASE_URL,
      queryParams
    );

    log.info("resultArray: %s", JSON.stringify(resultArray, null, 2));

    // Check that all three values in the original submit request are
    // covered by the query response.
    const valuesSeen = resultArray[0].values.map(
      (sample: Array<[number, string]>) => sample[1]
    );
    log.info("values seen: %s", valuesSeen);
    for (const v of ["0", "1", "2"]) {
      log.info("check for presence of value %s", v);
      assert(valuesSeen.includes(v));
    }

    // pragmatic criterion for starters: expect a number of values. with the
    // 1-second step size there should be tens or hundreds of values/samples.
    assert.strictEqual(resultArray[0]["values"].length > 5, true);
  });

  test("dd_api_run_agent_container_query_sysuptime", async function () {
    const now = ZonedDateTime.now();

    // The DD agent container is currently configured to send metrics to the DD
    // API endpoint for the 'default' tenant.
    const terminateContainer = await startDDagentContainer();

    // Wait for some more samples to be pushed. Terminate contaienr before
    // starting the query phase, so that the termination happens more or less
    // reliably (regardless of errors during query phase).
    await sleep(15);
    await terminateContainer();
    const searchStart = now.minusMinutes(45);
    const searchEnd = now.plusMinutes(10);

    // Note that this current setup does not insert a unique metric stream,
    // i.e. if the test passes it does only guarantee that the insertion
    // succeeded when the cluster is fresh (when this test was not run before
    // against the same cluster. TODO: think about how to set a unique label
    // here.
    const queryParams = {
      // This implicitly checks for two labels to be set by the translation
      // layer. Change with care!
      query: `system_uptime{job="ddagent", type="gauge"}`,
      start: searchStart.toEpochSecond().toString(),
      end: searchEnd.toEpochSecond().toString(),
      step: "60s"
    };

    const resultArray = await waitForCortexQueryResult(
      TENANT_DEFAULT_CORTEX_API_BASE_URL,
      queryParams
    );

    log.info("resultArray: %s", JSON.stringify(resultArray, null, 2));

    assert(resultArray[0].values.length > 1);
    // confirm that there is just one stream (set of labels)
    assert(resultArray.length == 1);

    // Expected structure:
    // "metric": {
    //   "__name__": "system_uptime",
    //   "instance": "x1carb6",
    //   "job": "ddagent",
    //   "source_type_name": "System",
    //   "type": "gauge"
    // },
    assert(resultArray[0].metric.source_type_name === "System");

    log.info("values seen: %s", JSON.stringify(resultArray[0].values, null, 2));
  });
});
