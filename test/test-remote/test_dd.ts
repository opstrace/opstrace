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

export async function startDDagentContainer() {
  log.info("start containerized DD agent");
  const docker = new Docker({ socketPath: "/var/run/docker.sock" });

  const dockerDNS = readDockerDNSSettings();
  log.info(`docker container dns settings: ${dockerDNS}`);

  let ddApiKey = "none";
  if (TENANT_DEFAULT_API_TOKEN_FILEPATH !== undefined) {
    ddApiKey = fs.readFileSync(TENANT_DEFAULT_API_TOKEN_FILEPATH, {
      encoding: "utf8"
    });
  }

  // const letsEncryptStagingRootCACert = fs.readFileSync(
  //   `${__dirname}/../containers/fakelerootx1.pem`,
  //   {
  //     encoding: "utf-8"
  //   }
  // );

  // const promConfigFilePath = createTempfile("prom-config-", ".conf");
  // fs.writeFileSync(promConfigFilePath, renderedConfigText, {
  //   encoding: "utf-8"
  // });

  const ddEnv = [
    `DD_API_KEY=${ddApiKey}`,
    `DD_DD_URL=${TENANT_DEFAULT_DD_API_BASE_URL}`,
    `CURL_CA_BUNDLE=""`
  ];

  log.info("container env: %s", ddEnv);

  const outfilePath = createTempfile("prom-container-", ".outerr");
  const outstream = fs.createWriteStream(outfilePath);
  await events.once(outstream, "open");

  const cont = await docker.createContainer({
    Image: "gcr.io/datadoghq/agent:7",
    AttachStdin: false,
    AttachStdout: false,
    AttachStderr: false,
    Tty: false,
    // Cmd: [
    //   "--config.file=/etc/prometheus/prometheus.yml",
    //   `--web.listen-address=127.0.0.1:${promListenPort}`,
    //   "--log.level=debug"
    // ],
    Env: ddEnv,
    HostConfig: {
      //NetworkMode: "host",
      Mounts: [
        // Mount Let's Encrypt Staging root CA into the container so that
        // golang discovers it when doing HTTP requests.
        {
          Type: "bind",
          Source: `${__dirname}/containers/fakelerootx1.pem`,
          // use a path discovered by Golang but not used by the distro in the container image
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

  const logNeedle = `Successfully posted payload to "${TENANT_DEFAULT_DD_API_BASE_URL}/api/v1/series`;
  const maxWaitSeconds = 30;
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
      outfilePath,
      fs.readFileSync(outfilePath, {
        encoding: "utf-8"
      })
    );
  }

  while (true) {
    if (mtime() > deadline) {
      log.info("deadline hit");
      await terminateContainer();
      throw new Error("DD agent container setup failed: deadline hit");
    }
    const fileHeadBytes = await readFirstNBytes(outfilePath, 10 ** 5);
    if (fileHeadBytes.includes(Buffer.from(logNeedle, "utf-8"))) {
      log.info("log needle found in container log, proceed");
      break;
    }
    await sleep(0.1);
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

  test("dd_api_run_dd_container", async function () {
    const terminateContainer = await startDDagentContainer();
    log.info("yes! now terminate");
    await terminateContainer();
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
});
