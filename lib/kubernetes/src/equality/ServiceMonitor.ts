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

import { isDeepStrictEqual } from "util";
import { V1Servicemonitor } from "..";

export const isServiceMonitorEqual = (
  desired: V1Servicemonitor,
  existing: V1Servicemonitor
): boolean => {
  if (!isDeepStrictEqual(desired.spec.selector, existing.spec.selector)) {
    return false;
  }
  if (desired.spec.jobLabel !== existing.spec.jobLabel) {
    return false;
  }
  if (!areEndpointsEqual(desired, existing)) {
    return false;
  }

  return true;
};

type Endpoint = {
  interval: string;
  port: string;
  path: string;
};

const areEndpointsEqual = (
  desired: V1Servicemonitor,
  existing: V1Servicemonitor
): boolean => {
  if (typeof desired.spec.endpoints !== typeof existing.spec.endpoints) {
    return false;
  }

  if (
    Array.isArray(desired.spec.endpoints) &&
    !(
      desired.spec.endpoints.length === existing.spec.endpoints.length &&
      !desired.spec.endpoints.find(
        (p, i) =>
          !isEndpointEqual(
            p as Endpoint,
            existing.spec.endpoints[i] as Endpoint
          )
      )
    )
  ) {
    return false;
  }

  return true;
};

const isEndpointEqual = (desired: Endpoint, existing: Endpoint): boolean => {
  return (
    desired.interval === existing.interval &&
    desired.port === existing.port &&
    desired.path === existing.path
  );
};
