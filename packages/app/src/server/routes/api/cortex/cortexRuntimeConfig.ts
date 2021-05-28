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

import { NextFunction, Request, Response } from "express";

import {
  createOrUpdateConfigMapWithRetry,
  ConfigMap
} from "@opstrace/kubernetes";
import { KubeConfig } from "@kubernetes/client-node";

import { isDevEnvironment, isRemoteDevEnvironment } from "server/env";
import { GeneralServerError } from "server/errors";
import { log } from "@opstrace/utils/lib/log";
import { validateAndExtractRuntimeConfig } from "state/cortex-config/utils";

const KUBECONFIG = new KubeConfig();

try {
  if (isDevEnvironment || isRemoteDevEnvironment) {
    KUBECONFIG.loadFromDefault();
  } else {
    // This will only work if running in cluster
  KUBECONFIG.loadFromCluster();
  }
} catch (err) {
  log.error("failed to load kubeconfig");
  process.exit(1);
}

const DATA_KEY = "runtime-config.yaml";

function genCortexRuntimeConfigCM(kubeconfig: KubeConfig, yamldoc: string) {
  // name and namespace and data key: are all convention-based, must be in sync
  // with controller / installer.

  const c = new ConfigMap(
    {
      apiVersion: "v1",
      data: {
        [DATA_KEY]: yamldoc
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
  try {
    // Make sure we're setting a valid runtime config. This will throw if validation fails
    await validateAndExtractRuntimeConfig(req.body);
  } catch (err) {
    // Will structure the error for the client in a consistent struct and will log a consistent error log structure
    // with the message from failed validation
    return next(new GeneralServerError(400, `bad request: ${err.message}`));
  }

  if (KUBECONFIG === undefined) {
    // This will be logged with a stack trace and handled correctly by our error middleware,
    // issueing a 500 back to the user with the error message below in the resonse body
    throw new Error("internal error: kubeconfig not set");
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
      // forward status code and log the message with the error logging middleware
      return next(
        new GeneralServerError(
          kr.statusCode,
          `Error during cortex runtime config map update. ` +
            `Kubernetes API returned status code ${kr.statusCode}. ` +
            `Message: ${kr.body.message}`
        )
        );
    }

    // When no HTTP response was received, i.e. upon transient errors.
    log.warning("error during config map update: %s", err); // log with stack trace
    return next(
      new GeneralServerError(
        500,
        `error during config map update: ${err.message}`
      )
    );
  }

  res.status(202).send("accepted: change is expected to take effect soon");
  return;
}
