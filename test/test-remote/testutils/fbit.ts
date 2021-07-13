/**
 * Copyright 2021 Opstrace, Inc.
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

import mustache from "mustache";
import Docker from "dockerode";

import {
  log,
  createTempfile,
  readDockerDNSSettings,
  readFirstNBytes,
  mtimeDeadlineInSeconds,
  terminateContainer,
  mtime,
  sleep
} from "./index";

export async function sendLogsWithFluentbitContainer(
  lokiApiDnsName: string,
  apiTokenFilePath: string | undefined,
  logLines: Array<string>,
  indexFieldName: string,
  indexFieldValue: string,
  fbitConfigTemplateFile: string,
  logNeedle: string
): Promise<void> {
  // The trailing newline is required for fluentd to pick up the last log
  // record.
  const logFileText = logLines.join("\n") + "\n";

  log.info("log file content (fluentbit tail input):\n%s", logFileText);
  const contentBytes = Buffer.from(logFileText, "utf-8");
  const logFilePath = createTempfile("fluentd-log-input-", ".log");
  fs.writeFileSync(logFilePath, contentBytes);

  // Send a noop string when no tenant API token was passed
  let apiToken = "noop";
  if (apiTokenFilePath) {
    apiToken = fs.readFileSync(apiTokenFilePath, {
      encoding: "utf-8"
    });
    log.info("using api token: %s", apiToken);
  }

  // Construct URL with basic auth info. username is ignored, password is
  // interpreted as tenant API authentication token

  //const lokiPushUrl = `https://uname:${apiToken}@${lokiApiDnsName}/loki/api/v1/push`;
  const lokiPushUrl = `https://uname:${process.env.REDTEAM_APITOKEN}@loki.redteam.jpdemo.opstrace.io/loki/api/v1/push`;

  const renderedConfigText = mustache.render(
    fs.readFileSync(
      `${__dirname}/../containers/fluentbit/${fbitConfigTemplateFile}`,
      {
        encoding: "utf-8"
      }
    ),
    {
      lokiPushUrl: lokiPushUrl,
      samples_log_file_path: logFilePath,
      indexFieldName: indexFieldName,
      indexFieldValue: indexFieldValue
    }
  );

  const fbitConfigFilePath = createTempfile("fluentd-config-", ".conf");
  fs.writeFileSync(fbitConfigFilePath, renderedConfigText, {
    encoding: "utf-8"
  });

  log.info("wrote config file to %s", fbitConfigFilePath);
  const outfilePath = createTempfile("fbfbit-container-", ".outerr");
  const outstream = fs.createWriteStream(outfilePath);
  await events.once(outstream, "open");

  log.info(
    "start containerized fluentbit with config:\n%s",
    renderedConfigText
  );
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

  const cont = await docker.createContainer({
    // TODO: specific version
    Image: "grafana/fluent-bit-plugin-loki:latest",
    AttachStdin: false,
    AttachStdout: false,
    AttachStderr: false,
    Tty: false,
    // Rely for `fbitConfigFilePath` to be in `/tmp` which is mounted into
    // container
    Cmd: [
      "/fluent-bit/bin/fluent-bit",
      "-e",
      "/fluent-bit/bin/out_grafana_loki.so",
      "-c",
      fbitConfigFilePath
    ],
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

  // When using the grafana loki output plugin there is no part of the
  // log that is a definite '204-accepted' criterion.

  while (true) {
    if (mtime() > deadline) {
      log.info("deadline hit");
      await terminateContainer(cont, outfilePath);
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
  await terminateContainer(cont, outfilePath);
}
