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

// import { strict as assert } from "assert";
import events from "events";
import fs, { readFileSync } from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";

import Docker from "dockerode";
import mustache from "mustache";
import winston from "winston";
import tmp from "tmp";
import jwt from "jsonwebtoken";

import got, { Response as GotResponse } from "got";
import { ZonedDateTime, DateTimeFormatter } from "@js-joda/core";

import getPort from "get-port";

import { PortForward } from "./portforward";

export const CORTEX_API_TLS_VERIFY = false;
export const LOKI_API_TLS_VERIFY = false;

const logFormat = winston.format.printf(
  ({ level, message, label, timestamp }) => {
    return `${timestamp} ${level}: ${message}`;
  }
);

export const log = winston.createLogger({
  levels: winston.config.syslog.levels,
  level: "info",
  format: winston.format.combine(
    winston.format.splat(),
    winston.format.timestamp(),
    winston.format.colorize(),
    logFormat
  ),
  transports: [new winston.transports.Console()]
});

const TMPDIRPATH = `${os.tmpdir()}${path.sep}opstrace-test-remote`;

export declare interface Dict<T = any> {
  [key: string]: T;
}

/**
 * In mochajs there is no "global hook" that would allow for running setup code
 * once as part of a mocha test suite run. As of
 * https://mochajs.org/#run-cycle-overview we can see that each "spec file" is
 * actually a suite, and while each suite can have its setup code there is no
 * more global hook for the "global test suite" (comprised of multiple per-file
 * test suites, let's call this test session as in pytest). There is the
 * concept of "root hooks", but I found this topic to be too controversial to
 * rely on it, see "ROOT HOOKS ARE NOT GLOBAL"
 * https://mochajs.org/#root-hooks-are-not-global  and also see
 * https://github.com/mochajs/mocha/issues/4308
 *
 * Workaround: do all test session setup logic in here, and then call this from
 * every setupSuite(), apply logic to make sure that the code only runs once.
 *
 * Note that previously the workaround was to simply put relevant code into
 * the body of this module, i.e. this relied on execute-on-first-import.
 * We then started using this module in other contexts (looker) and the side
 * effect of import became intolerable.
 */
export let CLUSTER_BASE_URL: string;
export let TEST_REMOTE_ARTIFACT_DIRECTORY: string;

export let TENANT_DEFAULT_CORTEX_API_BASE_URL: string;
export let TENANT_DEFAULT_DD_API_BASE_URL: string;
export let TENANT_DEFAULT_LOKI_API_BASE_URL: string;
export let TENANT_DEFAULT_API_TOKEN_FILEPATH: string | undefined;

export let TENANT_SYSTEM_CORTEX_API_BASE_URL: string;
export let TENANT_SYSTEM_LOKI_API_BASE_URL: string;
export let TENANT_SYSTEM_API_TOKEN_FILEPATH: string | undefined;

let globalTestSuiteSetupPerformed = false;
export function globalTestSuiteSetupOnce() {
  log.info("globalTestSuiteSetupOnce()");

  if (globalTestSuiteSetupPerformed) {
    return;
  }
  globalTestSuiteSetupPerformed = true;

  const clusterName: string = process.env.OPSTRACE_CLUSTER_NAME || "";
  if (!clusterName) {
    log.error("env variable OPSTRACE_CLUSTER_NAME must be set");
    process.exit(1);
  }

  const provider: string = process.env.OPSTRACE_CLOUD_PROVIDER || "";
  if (!provider) {
    log.error(
      "env variable OPSTRACE_CLOUD_PROVIDER must be set to `aws` or `gcp`"
    );
    process.exit(1);
  }

  TENANT_DEFAULT_API_TOKEN_FILEPATH =
    process.env.TENANT_DEFAULT_API_TOKEN_FILEPATH || undefined;
  TENANT_SYSTEM_API_TOKEN_FILEPATH =
    process.env.TENANT_SYSTEM_API_TOKEN_FILEPATH || undefined;

  log.info(
    "TENANT_DEFAULT_API_TOKEN_FILEPATH: %s (if undefined: don't authenticate requests)",
    TENANT_DEFAULT_API_TOKEN_FILEPATH
  );
  log.info(
    "TENANT_SYSTEM_API_TOKEN_FILEPATH: %s (if undefined: don't authenticate requests)",
    TENANT_SYSTEM_API_TOKEN_FILEPATH
  );

  // When the test runner is meant to create output artifacts (files) then it
  // needs to know which directory it's supposed to write them in. Default to
  // the current working directory but allow this to be set via env var -- used
  // for containerized invocation of the test runner during `make test-remote`.
  TEST_REMOTE_ARTIFACT_DIRECTORY =
    process.env.TEST_REMOTE_ARTIFACT_DIRECTORY || ".";

  // throws an error if TEST_REMOTE_ARTIFACT_DIRECTORY does not exist.
  if (!fs.lstatSync(TEST_REMOTE_ARTIFACT_DIRECTORY).isDirectory()) {
    log.error(
      "TEST_REMOTE_ARTIFACT_DIRECTORY does not seem to be a directory: %s",
      TEST_REMOTE_ARTIFACT_DIRECTORY
    );
    process.exit(1);
  }

  log.info(
    "Using TEST_REMOTE_ARTIFACT_DIRECTORY: %s",
    TEST_REMOTE_ARTIFACT_DIRECTORY
  );

  for (const tfp of [
    TENANT_SYSTEM_API_TOKEN_FILEPATH,
    TENANT_DEFAULT_API_TOKEN_FILEPATH
  ]) {
    if (tfp !== undefined) {
      const token = fs
        .readFileSync(tfp, {
          encoding: "utf8"
        })
        .trim();
      log.info("inspect authentication token: %s", token);
      // Decode payload w/o verifying signature. Note that the return type
      // as of the time of writing does not even allow for writing
      // `if (claims.aud === undefined) {}` because tsc would error out with
      // "Property 'aud' does not exist on type 'string | { [key: string]: any; }'.ts(7053)""
      const claims = jwt.decode(token) as Dict<string>;
      log.info(
        "jwt from path %s has claims %s",
        tfp,
        JSON.stringify(claims, null, 2)
      );
      if (claims["aud"] !== `opstrace-cluster-${clusterName}`) {
        log.error(
          "aud claim (%s) does not match expected value %s",
          claims["aud"],
          `opstrace-cluster-${clusterName}`
        );
        process.exit(1);
      }
    }
  }

  CLUSTER_BASE_URL = `https://${clusterName}.opstrace.io`;
  TENANT_DEFAULT_LOKI_API_BASE_URL = `https://loki.default.${clusterName}.opstrace.io`;
  TENANT_DEFAULT_DD_API_BASE_URL = `https://dd.default.${clusterName}.opstrace.io`;
  TENANT_DEFAULT_CORTEX_API_BASE_URL = `https://cortex.default.${clusterName}.opstrace.io`;
  TENANT_SYSTEM_LOKI_API_BASE_URL = `https://loki.system.${clusterName}.opstrace.io`;
  TENANT_SYSTEM_CORTEX_API_BASE_URL = `https://cortex.system.${clusterName}.opstrace.io`;

  log.info("CLUSTER_BASE_URL: %s", CLUSTER_BASE_URL);

  log.info(
    "TENANT_DEFAULT_LOKI_API_BASE_URL: %s",
    TENANT_DEFAULT_LOKI_API_BASE_URL
  );

  log.info(
    "TENANT_DEFAULT_DD_API_BASE_URL: %s",
    TENANT_DEFAULT_DD_API_BASE_URL
  );

  log.info(
    "TENANT_SYSTEM_LOKI_API_BASE_URL: %s",
    TENANT_SYSTEM_LOKI_API_BASE_URL
  );

  log.info(
    "TENANT_DEFAULT_CORTEX_API_BASE_URL: %s",
    TENANT_DEFAULT_CORTEX_API_BASE_URL
  );

  log.info(
    "TENANT_SYSTEM_CORTEX_API_BASE_URL: %s",
    TENANT_SYSTEM_CORTEX_API_BASE_URL
  );

  // Create a definite temporary directory for this test runner, within the
  // operating system's TMPDIR (shared across test runner invocation,
  // "insecure" properties are fine). Subsequently put unique and "secure"
  // per-run temporary files in there. The function `createTempfile()` below is
  // the way to do that.

  try {
    fs.mkdirSync(TMPDIRPATH, { mode: 0o777 });
    log.info("Created %s", TMPDIRPATH);
  } catch (err) {
    if (err.code !== "EEXIST") throw err;
  }
}

/**
 * Create a new temporary file, with a base name containing randomness. The
 * absolute path has the structure $TMPDIR_ON_HOST/TEST_RUNNER_DIR/<basename>.
 *
 * The file is created with the lib https://raszi.github.io/node-tmp/
 *
 * Return the absolute path to the file.
 */
export function createTempfile(prefix: string, suffix: string): string {
  // Expected to return absolute path.
  return tmp.fileSync({
    dir: TMPDIRPATH,
    prefix: prefix,
    postfix: suffix,
    keep: true
  }).name;
}

// @ts-ignore: implicit any type
export function testName(thisFromMocha) {
  // https://stackoverflow.com/a/26534968/145400
  // `thisFromMocha` is the context object passed to a Mocha test. Extract the
  // test's full name (containing the test suite name) and generate an ID from
  // it which is human-readable but does not contain whitespace, only contains
  // alphanumeric and lowercase characters.
  return thisFromMocha.test.fullTitle().replace(/\W+/g, "-").toLowerCase();
}

export function rndstring(length = 5) {
  /*
  Calling

    rndstrings.push(rndstring(10));

  10^6 times on my machine takes ~4 seconds.
  */
  return crypto
    .randomBytes(length + 1)
    .toString("base64")
    .replace(/\//g, "_")
    .replace(/\+/g, "_")
    .replace(/=/g, "")
    .slice(0, length);
}

export function rndstringFast(length = 5) {
  return crypto
    .randomBytes(length + 1)
    .toString("base64")
    .slice(0, length);
}

export function rndstringFastBoringFill(rndlen: number, boringlen: number) {
  return (
    crypto
      .randomBytes(rndlen + 1)
      .toString("base64")
      .slice(0, rndlen) + "a".repeat(boringlen)
  );
}

/**
 * Translate a joda datetime object into a an integer string, indicating the
   number of nanoseconds passed since epoch. Example:

  timestamp('2001-01-05T10:00:01.123456789Z') --> '978688801123456789'

  The outcome is used common way to represent a specific point in time in the
  Prometheus ecosystem, e.g. used in the HTTP API.

  The `ZonedDateTime` object `ts` might not have a sub-second resolution, in
  which case `ts.nano()` seems to still return `0`. Zero-pad the nano-second
  part, i.e. if `ts.nano()` returns 1, append a '000000001'.
 */
export function timestampToNanoSinceEpoch(ts: ZonedDateTime): string {
  return `${ts.toEpochSecond()}${ts.nano().toString().padStart(9, "0")}`;
}

export function timestampToRFC3339Nano(ts: ZonedDateTime): string {
  /*
  Return a timestamp string using the text format that Go's standard library
  calls RFC3339Nano, an ISO 8601 timestamp string with nanosecond resolution.

  Ref: https://js-joda.github.io/js-joda/manual/formatting.html

  DateTimeFormatter is seemingly not documented, but
  https://github.com/js-joda/js-joda/issues/181 shows how to make complex
  patterns, in particular how to escape arbitrary text within the pattern
  string.

  */
  if (ts.zone().toString() !== "Z") throw Error("code assumes Zulu time");
  return ts.format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.n'Z'"));
}

export function sleep(seconds: number) {
  // https://stackoverflow.com/a/39914235/145400
  return new Promise(resolve => setTimeout(resolve, seconds * 1000.0));
}

// https://nodejs.org/api/process.html#process_process_hrtime_time
// https://stackoverflow.com/a/58945714/145400
export function mtime(): bigint {
  // The clock source is an in-process monotonic time source with high temporal
  // resolution. The absolute value is meaningless. The difference between
  // consecutively obtained values (type BigInt) is the wall time passed in
  // nanoseconds.
  return process.hrtime.bigint();
}

/*
Return time difference of now compared to `ref` in seconds. Ret

`ref` must be a value previously obtained from `mtime()`. Number()
converts a BigInt to a regular Number type, allowing for translating from
nanoseconds to seconds with a simple division, retaining sub-second
resolution. This assumes that the measured time duration does not grow
beyond 104 days.
*/
export function mtimeDiffSeconds(ref: bigint): number {
  return Number(process.hrtime.bigint() - ref) / 10 ** 9;
}

export function mtimeDeadlineInSeconds(seconds: number): bigint {
  return process.hrtime.bigint() + BigInt(seconds * 10 ** 9);
}

export function mtimeDeadlineTimeLeftSeconds(deadline: bigint): number {
  // given a deadline as returned by `mtimeDeadlineInSeconds` calculate
  // the time left in seconds from _now_ until that deadline is hit.
  return Number(deadline - mtime()) / 10 ** 9;
}

export async function readFirstNBytes(
  path: fs.PathLike,
  n: number
): Promise<Buffer> {
  const chunks = [];
  for await (const chunk of fs.createReadStream(path, { start: 0, end: n })) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
  //log.debug("read head of file: %s", fileHead);
}

// Manually applies the specified token file to the headers.
export function enrichHeadersWithAuthTokenFile(
  authTokenFilepath: string | undefined,
  headers: Record<string, string>
): Record<string, string> {
  if (!authTokenFilepath) {
    // shortcut: skip addition if file is not configured
    return headers;
  }
  log.info("read token from %s", authTokenFilepath);
  const tenantAuthToken = fs
    .readFileSync(authTokenFilepath, {
      encoding: "utf8"
    })
    .trim();
  if (!tenantAuthToken) {
    throw new Error("auth token file defined, but file is empty: ${tokenFilepath}");
  }
  headers["Authorization"] = `Bearer ${tenantAuthToken}`;
  return headers;
}

// Autodetects the auth token to use based on the URL and applies it to the headers.
export function enrichHeadersWithAuthToken(
  url: string,
  headers: Record<string, string>
): Record<string, string> {
  // automatically add authentication proof

  const mapping: Record<string, string> = {};
  mapping[TENANT_DEFAULT_CORTEX_API_BASE_URL] =
    TENANT_DEFAULT_API_TOKEN_FILEPATH || "";
  mapping[TENANT_DEFAULT_LOKI_API_BASE_URL] =
    TENANT_DEFAULT_API_TOKEN_FILEPATH || "";
  mapping[TENANT_SYSTEM_CORTEX_API_BASE_URL] =
    TENANT_SYSTEM_API_TOKEN_FILEPATH || "";
  mapping[TENANT_SYSTEM_LOKI_API_BASE_URL] =
    TENANT_SYSTEM_API_TOKEN_FILEPATH || "";

  for (const [baseurl, tokenFilepath] of Object.entries(mapping)) {
    if (url.startsWith(baseurl)) {
      if (tokenFilepath !== "") {
        // Found match, add to headers and exit
        return enrichHeadersWithAuthTokenFile(tokenFilepath, headers)
      }
    }
  }

  // Give up and return existing headers
  return headers;
}

// Check if we're running the DNS cache by reading from the file the
// ci/dns_cache.sh script creates with the IP address of the DNS cache server.
export function readDockerDNSSettings(): any[] | undefined {
  try {
    return [readFileSync("/tmp/dns_cache_ip").toString()];
  } catch (e) {
    log.warning(`could not read docker dns settings: ${e.message}`);
    return undefined;
  }
}

export async function sendMetricsWithPromContainer(
  remoteWriteUrl: string,
  indexFieldValue: string,
  apiTokenFilePath: string | undefined
) {
  // Allow for more than one of these containers / operations to run
  // concurrently by choosing a dynamic port for that prometheus instance to
  // listen on. This `getPort()` technique is still subject to race conditions
  // because between calling getPort() and then starting prometheus a little
  // bit of time passes (~1 second), and within that time another racer might
  // steal this port from us. That's however already quite unlikely and much
  // better than using the same port for all instances.

  const promListenPort = await getPort();

  const renderedConfigText = mustache.render(
    fs.readFileSync(
      `${__dirname}/../containers/prometheus/prom.conf.template`,
      {
        encoding: "utf-8"
      }
    ),
    {
      remote_write_url: remoteWriteUrl,
      index_field_value: indexFieldValue,
      prom_listen_port: promListenPort,
      bearerTokenFilePath: apiTokenFilePath
    }
  );

  const promConfigFilePath = createTempfile("prom-config-", ".conf");
  fs.writeFileSync(promConfigFilePath, renderedConfigText, {
    encoding: "utf-8"
  });

  // Make Unix user in Prom container otherwise be able to read the file.
  fs.chmodSync(promConfigFilePath, 0o774);

  const outfilePath = createTempfile("prom-container-", ".outerr");
  const outstream = fs.createWriteStream(outfilePath);
  await events.once(outstream, "open");

  log.info(
    "start containerized Prometheus with config:\n%s",
    renderedConfigText
  );
  const docker = new Docker({ socketPath: "/var/run/docker.sock" });

  const dockerDNS = readDockerDNSSettings();
  log.info(`docker container dns settings: ${dockerDNS}`);

  const mounts: Docker.MountConfig = [
    {
      Type: "bind",
      Source: promConfigFilePath,
      Target: "/etc/prometheus/prometheus.yml",
      ReadOnly: true
    },
    {
      Type: "bind",
      Source: "/tmp",
      Target: "/tmp",
      ReadOnly: false
    }
  ];

  if (apiTokenFilePath !== undefined) {
    mounts.push({
      Type: "bind",
      Source: apiTokenFilePath!,
      Target: apiTokenFilePath!,
      ReadOnly: true
    });
  }

  const cont = await docker.createContainer({
    Image: "prom/prometheus:v2.21.0",
    AttachStdin: false,
    AttachStdout: false,
    AttachStderr: false,
    Tty: false,
    Cmd: [
      "--config.file=/etc/prometheus/prometheus.yml",
      `--web.listen-address=127.0.0.1:${promListenPort}`,
      "--log.level=debug"
    ],
    HostConfig: {
      NetworkMode: "host",
      Mounts: mounts,
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

  const logNeedle = "Server is ready to receive web requests";
  const maxWaitSeconds = 15;
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
      throw new Error("Prometheus container setup failed: deadline hit");
    }
    const fileHeadBytes = await readFirstNBytes(outfilePath, 10 ** 4);
    if (fileHeadBytes.includes(Buffer.from(logNeedle, "utf-8"))) {
      log.info("log needle found in container log, proceed");
      break;
    }
    await sleep(0.1);
  }

  const maxWaitSeconds2 = 30;
  const deadline2 = mtimeDeadlineInSeconds(maxWaitSeconds2);
  log.info(
    "wait for containerized Prom to scrape & remote_write metrics, deadline in %s s",
    maxWaitSeconds2
  );
  const t0 = mtime();
  const rgx = /\sprometheus_remote_storage_succeeded_samples_total{.*} (?<count>[0-9]+)\s/;
  const metricsUrl = `http://127.0.0.1:${promListenPort}/metrics`;

  while (true) {
    await sleep(0.1);

    if (mtime() > deadline2) {
      log.info("deadline hit");
      await terminateContainer();
      throw new Error(
        `deadline hit while waiting for expected data on ${metricsUrl}`
      );
    }

    const response = await got(metricsUrl, {
      throwHttpErrors: false,
      timeout: httpTimeoutSettings
    });
    if (response.statusCode == 200 && response.body) {
      // log.info(response.body);
      // With got 9.6 the `response.body` object is of type `string`
      const match = response.body.match(rgx);
      if (!match) continue;
      const groups = match.groups;
      if (!groups) continue;
      const count = groups.count;
      log.debug("count: %s", count);
      if (Number(count) > 0) {
        log.info(
          "prometheus_remote_storage_succeeded_samples_total > 0: %s",
          count
        );
        log.info("this took %s s", mtimeDiffSeconds(t0).toFixed(2));
        break;
      }
    } else {
      log.error("Got unexpected HTTP response from Prom /metrics");
      logHTTPResponse(response);
    }
  }

  // Note: abstract container into a class, perform cleanup upon test runner
  // exit. Also: handle errors, don't let errors get in the way of cleanup.
  await terminateContainer();
}

export async function sendLogsWithFluentDContainer(
  lokiBaseUrl: string,
  apiTokenFilePath: string | undefined,
  logfileJsonDocs: Array<unknown>,
  indexFieldName: string,
  indexFieldValue: string,
  fluentConfigTemplateFile: string,
  logNeedle: string
) {
  const lines = logfileJsonDocs.map(obj => JSON.stringify(obj));

  // The trailing newline is required for fluentd to pick up the last log
  // record.
  const logFileText = lines.join("\n") + "\n";

  log.info("log file content (fluentd tail input):\n%s", logFileText);
  const contentBytes = Buffer.from(logFileText, "utf-8");
  const logFilePath = createTempfile("fluentd-log-input-", ".log");
  fs.writeFileSync(logFilePath, contentBytes);

  if (apiTokenFilePath !== undefined && apiTokenFilePath.length > 0) {
    log.info("api token passed, will set config param bearer_token_file");
  }

  const renderedConfigText = mustache.render(
    fs.readFileSync(
      `${__dirname}/../containers/fluentd/${fluentConfigTemplateFile}`,
      {
        encoding: "utf-8"
      }
    ),
    {
      loki_api_base_url: lokiBaseUrl,
      samples_log_file_path: logFilePath,
      indexFieldName: indexFieldName,
      indexFieldValue: indexFieldValue,
      bearerTokenFilePath: apiTokenFilePath
    }
  );

  const fluentdConfigFilePath = createTempfile("fluentd-config-", ".conf");
  fs.writeFileSync(fluentdConfigFilePath, renderedConfigText, {
    encoding: "utf-8"
  });

  const outfilePath = createTempfile("fluentd-container-", ".outerr");
  const outstream = fs.createWriteStream(outfilePath);
  await events.once(outstream, "open");

  log.info("start containerized fluentd with config:\n%s", renderedConfigText);
  const docker = new Docker({ socketPath: "/var/run/docker.sock" });

  const dockerDNS = readDockerDNSSettings();
  log.info(`docker container dns settings: ${dockerDNS}`);

  const mounts: Docker.MountConfig = [
    {
      Type: "bind",
      Source: "/tmp",
      Target: "/tmp",
      ReadOnly: false
    }
  ];

  if (apiTokenFilePath !== undefined) {
    mounts.push({
      Type: "bind",
      Source: apiTokenFilePath!,
      Target: apiTokenFilePath!,
      ReadOnly: true
    });
  }

  const cont = await docker.createContainer({
    // use the same container as is used in the opstrace cluster for collecting
    // and pushing system logs.
    Image: "opstrace/systemlog-fluentd:fe6d0d84-dev",
    AttachStdin: false,
    AttachStdout: false,
    AttachStderr: false,
    Tty: false,
    Cmd: ["fluentd", "-c", fluentdConfigFilePath],
    HostConfig: {
      NetworkMode: "host",
      Mounts: mounts,
      Dns: readDockerDNSSettings()
    }
  });

  log.info("attach file-backed stream");

  // Attach file-backed stream for progress analysis.
  const stream = await cont.attach({
    stream: true,
    stdout: true,
    stderr: true
  });
  stream.pipe(outstream);

  log.info("container start()");
  await cont.start();

  const maxWaitSeconds = 15;
  const deadline = mtimeDeadlineInSeconds(maxWaitSeconds);
  log.info(
    "Waiting for needle to appear in container log, deadline in %s s. Needle: %s",
    maxWaitSeconds,
    logNeedle
  );

  async function terminateContainer() {
    log.info("terminate container");
    await cont.kill({ signal: "SIGTERM" });
    log.info("wait for container to stop");
    await cont.wait();
    log.info("force-remove container");
    await cont.remove({ force: true });
    log.info("container removed");
  }

  // In case of the HTTP output plugin the "202 Accepted" (only in the fluentd
  // stdout/err when using `log_level debug`) means that the insertion
  // succceeded. That's a reliable criterion. When using the Loki plugin there
  // is a message e.g. "send 450 bytes to Loki" which I assume is logged
  // shortly before actually firing off the HTTP request, and there is no log
  // output indicating the progress or success/failure of this operation. That
  // is, in case of the Loki plugin this method for "waiting for the send to
  // have happened" is unreliable.

  while (true) {
    if (mtime() > deadline) {
      log.info("deadline hit");
      await terminateContainer();
      throw new Error("fluentd container setup (or send) failed: deadline hit");
    }
    const fileHeadBytes = await readFirstNBytes(outfilePath, 10 ** 4);
    if (fileHeadBytes.includes(Buffer.from(logNeedle, "utf-8"))) {
      // note that if the log needle is "bytes to loki" as in
      // "sending 500 bytes to loki" then this is right before an HTTP
      // request is fired off.
      log.info("log needle found in container log, proceed");
      break;
    }
    await sleep(0.1);
  }

  // Note: abstract container into a class, perform cleanup upon test runner
  // exit. Also: handle errors, don't let errors get in the way of cleanup.
  await terminateContainer();
}

export function logHTTPResponse(
  resp: GotResponse<string> | GotResponse<Buffer>
) {
  // `slice()` works regardless of Buffer or string.
  let bodyPrefix = resp.body.slice(0, 500);
  // If buffer: best-effort decode the buffer into text (this method does _not_
  // not blow up upon unexpected byte sequences).
  if (Buffer.isBuffer(bodyPrefix)) bodyPrefix = bodyPrefix.toString("utf-8");

  // about timings also see
  // https://gehrcke.de/2020/02/nodejs-http-clientrequest-finished-event-has-the-request-body-been-flushed-out/
  // Timings are exposed in milliseconds elapsed since the UNIX epoch, that is
  // where the /1000.0 comes from. Individual properties in the `.phases`
  // object may be `undefined` as far as the compiler is concerned and
  // potentially during runtime (I don't quite see how that can happen, but
  // anyway). In those cases use "nullish coalescing" to emit a negative
  // number.
  const ts = resp.timings;
  log.info(`HTTP resp to ${resp.request.options.method}(${resp.requestUrl}):
  status: ${resp.statusCode}
  body[:500]: ${bodyPrefix}
  headers: ${JSON.stringify(resp.headers)}
  totalTime: ${(ts.phases.total ?? -1000) / 1000.0} s
  dnsDone->TCPconnectDone: ${(ts.phases.tcp ?? -1000) / 1000.0} s
  connectDone->reqSent ${(ts.phases.request ?? -1000) / 1000.0} s
  reqSent->firstResponseByte: ${(ts.phases.firstByte ?? -1000) / 1000.0} s
  `);
}

export function logHTTPResponseLight(resp: GotResponse) {
  const t1 = (resp.timings.phases.total ?? -1000) / 1000.0;
  const t2 = (resp.timings.phases.firstByte ?? -1000) / 1000.0;
  log.info(
    `resp to ${resp.request.options.method} -> ${
      resp.statusCode
    }. total time: ${t1.toFixed(2)} s. resp time: ${t2.toFixed(2)} `
  );
}

// Generic HTTP timeout settings object for HTTP requests made with `got`. Note
// that every time that this test suite fires off an HTTP request we should
// timeout-control the individual request phases (by default `got` waits
// indefinitely, in every phase of the request). For that, either use the
// following generic settings or some more specific settings adjusted to the
// test. Ref: https://www.npmjs.com/package/got/v/9.6.0#timeout
export const httpTimeoutSettings = {
  // If a TCP connect() takes longer then ~5 seconds then most certainly there
  // is a networking issue, fail fast in that case.
  connect: 10000,
  request: 60000
};

export async function sendAlertToAlertmanager(
  portForwardAlertmanager: PortForward,
  alertDefinition: string
) {
  const maxWaitSeconds = 15;
  const deadline = mtimeDeadlineInSeconds(maxWaitSeconds);
  log.info("Sending alert to Alertmanager; deadline in %s s.", maxWaitSeconds);

  const t0 = mtime();
  const url = `http://localhost:${portForwardAlertmanager.port_local}/alertmanager/api/v1/alerts`;

  log.info(`Alert definition: ${alertDefinition}`);
  log.info(`Alertmanager URL: ${url}`);

  while (true) {
    if (mtime() > deadline) {
      log.info("Deadline hit");
      throw new Error("Prometheus container setup failed: deadline hit");
    }
    await sleep(0.1);

    try {
      const response = await got.post(url, { body: alertDefinition });
      if (response.statusCode == 200 && response.body) {
        log.info("Alertmanager response: " + response.body);
        log.info("This took %s s", mtimeDiffSeconds(t0).toFixed(2));
        break;
      } else {
        log.error("Got unexpected HTTP response from Prom /metrics");
        logHTTPResponse(response);
      }
    } catch (error) {
      log.error("Got unexpected error from HTTP call to Alertmanager");
      logHTTPResponse(error);
    }
  }
}
