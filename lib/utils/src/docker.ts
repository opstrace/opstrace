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

/**
* Check if docker image exists on docker hub. `imageName` is expected to
* define both the repository and the image tag, separated with a colon.
*
* Exit process when image name does not satisfy that requirement or when image
* does not exist.
*
* Note: this is just a pragmatic check trying to help with a workflow trap,
* may want to allow for overriding this check. Also, upon umbiguous signal
* (not one of 200 or 404 reponse) do not error out.
*/

import got, { Response as GotResponse } from "got";

import { log } from "./log";
import { die } from "./die";

export async function checkIfDockerImageExistsOrErrorOut(imageName: string) {
  log.info("check if docker image exists on docker hub: %s", imageName);
  const splits = imageName.split(":");
  if (splits.length != 2) {
    die("unexpected controller image name");
  }
  const repo = splits[0];
  const imageTag = splits[1];

  const probeUrl = `https://hub.docker.com/v2/repositories/${repo}/tags/${imageTag}/`;
  const requestSettings = {
    throwHttpErrors: false,
    retry: 3,
    timeout: {
      connect: 3000,
      request: 10000
    }
  };

  let resp: GotResponse<string> | GotResponse<Buffer> | undefined;

  try {
    resp = await got(probeUrl, requestSettings);
  } catch (e) {
    if (e instanceof got.RequestError) {
      log.info(`could not detect presence of docker image: ${e.message} -- ignored, proceed`);
      return;
    } else {
      throw e;
    }
  }

  if (resp && resp.statusCode == 404) {
    die("docker image not present on docker hub: you might want to push that first");
  }

  if (resp && resp.statusCode == 200) {
    log.info("docker image present on docker hub, continue");
    return;
  }

  log.info("unexpected response, ignore");
  log.debug("respo status code: %s", resp.statusCode);

  if (resp.body) {
    // `slice()` works regardless of Buffer or string.
    let bodyPrefix = resp.body.slice(0, 500);
    // If buffer: best-effort decode the buffer into text (this method does _not_
    // not blow up upon unexpected byte sequences).
    if (Buffer.isBuffer(bodyPrefix)) bodyPrefix = bodyPrefix.toString("utf-8");
    log.debug(`response body, first 500 bytes: ${bodyPrefix}`);
  }
}
