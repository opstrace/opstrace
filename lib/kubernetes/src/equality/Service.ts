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

import { isDeepStrictEqual } from "util";
import { V1ServiceSpec, V1ServicePort } from "@kubernetes/client-node";

export const isServiceSpecEqual = (
  desired: V1ServiceSpec,
  existing: V1ServiceSpec
): boolean => {
  if (!isDeepStrictEqual(desired.selector, existing.selector)) {
    return false;
  }
  if (!areServicePortsEqual(desired, existing)) {
    return false;
  }

  if (
    Array.isArray(desired.loadBalancerSourceRanges) &&
    desired.loadBalancerSourceRanges.length &&
    !Array.isArray(existing.loadBalancerSourceRanges)
  ) {
    return false;
  }

  if (
    Array.isArray(desired.loadBalancerSourceRanges) &&
    !(
      desired.loadBalancerSourceRanges.length ===
        ((existing.loadBalancerSourceRanges &&
          existing.loadBalancerSourceRanges!.length) ||
          0) &&
      !desired.loadBalancerSourceRanges.find(
        (p, i) => p !== existing.loadBalancerSourceRanges![i]
      )
    )
  ) {
    return false;
  }

  return true;
};

const areServicePortsEqual = (
  desired: V1ServiceSpec,
  existing: V1ServiceSpec
): boolean => {
  if (typeof desired.ports !== typeof existing.ports) {
    return false;
  }

  if (
    Array.isArray(desired.ports) &&
    !(
      desired.ports.length === existing.ports!.length &&
      !desired.ports.find((p, i) => !isServicePortEqual(p, existing.ports![i]))
    )
  ) {
    return false;
  }

  return true;
};

const isServicePortEqual = (
  desired: V1ServicePort,
  existing: V1ServicePort
): boolean => {
  if (
    (desired.name && desired.name !== existing.name) ||
    (desired.nodePort && desired.nodePort !== existing.nodePort) ||
    (desired.port && desired.port !== existing.port) ||
    (desired.targetPort && desired.targetPort !== existing.targetPort)
  ) {
    return false;
  }
  if (
    desired.protocol !== undefined &&
    desired.protocol !== existing.protocol
  ) {
    return false;
  }

  return true;
};
