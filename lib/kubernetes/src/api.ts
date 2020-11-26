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

import { K8sResource } from "./common";
import { kubernetesError } from "./utils";
import { log } from "@opstrace/utils";

export const createResource = async (resource: K8sResource) => {
  log.debug(
    "createResource for %s(ns: %s):",
    resource.name,
    resource.namespace
  );
  try {
    await resource.create();
  } catch (e) {
    const err = kubernetesError(e);
    if (err.statusCode !== 409) {
      log.info(
        "api err during createResource for %s(ns: %s): %s",
        resource.name,
        resource.namespace,
        err.message
      );
    } else {
      log.debug("createResource(): ignored 409 error");
    }
  }
  return;
};

export const deleteResource = async (resource: K8sResource) => {
  try {
    await resource.delete();
  } catch (e) {
    const err = kubernetesError(e);
    if (err.statusCode !== 404) {
      log.error(err.message);
    }
  }
  return;
};

export const updateResource = async (resource: K8sResource) => {
  try {
    await resource.update();
  } catch (e) {
    const err = kubernetesError(e);
    log.error(err.message);
  }
  return;
};
