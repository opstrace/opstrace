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

import yaml from "js-yaml";
import { NextFunction, Request, Response } from "express";

import { log } from "@opstrace/utils/lib/log";

import {
  createOrUpdateConfigMapWithRetry,
  ConfigMap
} from "@opstrace/kubernetes";

import { KubeConfig } from "@kubernetes/client-node";

const KUBECONFIG = new KubeConfig();
// This will only work if running in remote-dev mode or in cluster
try {
  KUBECONFIG.loadFromCluster();
} catch (err) {}

function genCortexRuntimeConfigCM(kubeconfig: KubeConfig, yamldoc: string) {
  // name and namespace and data key: are all convention-based, must be in sync
  // with controller / installer.

  const c = new ConfigMap(
    {
      apiVersion: "v1",
      data: {
        "runtime-config.yaml": yamldoc
      },
      kind: "ConfigMap",
      metadata: {
        name: "cortex-runtime-config",
        namespace: "cortex"
      }
    },
    kubeconfig
  );

  // Custom convention (using k8s annotations), so that the Opstrace controller
  // will not delete/overwrite this config map when it detects change.
  c.setImmutable();
  return c;

  // Note that we could use the @kubernetes/client-node primitives more directly":
  // const k8sapi = KUBECONFIG.makeApiClient(CoreV1Api);
  // response: IncomingMessage;
  // body: V1ConfigMap;
  // const cmname = "cortex-runtime-config";
  // const cmnamespace = "cortex";
  // const { body } = await k8sapi.readNamespacedConfigMap(cmname, cmnamespace);
  // but below we use `createOrUpdateConfigMapWithRetry()` which is made for
  // our @opstrace/kubernetes abstraction
}

// Expect a valid cortex runtime config document
// Context: https://cortexmetrics.io/docs/configuration/arguments/#runtime-configuration-file
export default async function setCortexRuntimeConfigHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  log.info("setCortexRuntimeConfigHandler: got request body: %s", req.body);

  try {
    yaml.load(req.body);
  } catch (err) {
    res
      .status(400)
      .send(`bad request: could not deserialize body as YAML: ${err.message}`);
    return;
  }

  if (KUBECONFIG === undefined) {
    log.warning(
      "setCortexRuntimeConfigHandler: cannot process request: kubeconfig not set; graceful degradation"
    );
    res.status(500).send("internal error: kubeconfig not set");
    return;
  }

  // Assume that `req.body` is the new config map's payload content.
  const newcm = genCortexRuntimeConfigCM(KUBECONFIG, req.body);
  try {
    await createOrUpdateConfigMapWithRetry(newcm, true);
  } catch (err) {
    // Expected error for invalid documents: response status
    // 422 Unprocessable Entity
    if (err.response !== undefined) {
      // Reflecting the HTTP response returned by the k8s API. Example:
      // 2021-05-19 18:33:24
      // 2021-05-19T16:33:24.678Z warning: e.response: {
      // 2021-05-19 18:33:24
      //   "statusCode": 422,
      // 2021-05-19 18:33:24
      //   "body": {
      // 2021-05-19 18:33:24
      //     "kind": "Status",
      // 2021-05-19 18:33:24
      //     "apiVersion": "v1",
      // 2021-05-19 18:33:24
      //     "metadata": {},
      // 2021-05-19 18:33:24
      //     "status": "Failure",
      const kr = err.response;
      // forward status code.
      res
        .status(kr.statusCode)
        .send(
          `Error during config map update. ` +
            `Kubernetes API returned status code ${kr.statusCode}. ` +
            `Message: ${kr.body.message}`
        );
      return;
    }

    // When no HTTP response was received, i.e. upon transient errors.
    log.warning("error during config map update: %s", err); // log with stack trace
    res.status(500).send(`error during config map update: ${err.message}`);
    return;
  }

  res.status(202).send("accepted: change is expected to take effect soon");
  return;
}
