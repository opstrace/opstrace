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
import { V1Prometheusrule } from "..";
import { isResourceListEqual } from "./utils";

export const isPrometheusRuleEqual = (
  desired: V1Prometheusrule,
  existing: V1Prometheusrule
): boolean => {
  if (!areGroupsEqual(desired, existing)) {
    return false;
  }

  return true;
};

type Group = {
  interval?: string;
  name: string;
  rules: Rule[];
};

type Rule = {
  alert?: string;
  annotations?: {
    [k: string]: unknown;
  };
  expr: string | number;
  for?: string;
  labels?: {
    [k: string]: unknown;
  };
  record?: string;
  [k: string]: unknown;
};

const areGroupsEqual = (
  desired: V1Prometheusrule,
  existing: V1Prometheusrule
): boolean => {
  if (typeof desired.spec.groups !== typeof existing.spec.groups) {
    return false;
  }

  if (
    !isResourceListEqual(
      desired.spec.groups,
      existing.spec.groups,
      (desired, existing) => isGroupEqual(desired, existing)
    )
  ) {
    return false;
  }

  return true;
};

const isGroupEqual = (desired: Group, existing: Group): boolean => {
  return (
    desired.interval === existing.interval &&
    desired.name === existing.name &&
    areRulesEqual(desired.rules, existing.rules)
  );
};

const areRulesEqual = (desired: Rule[], existing: Rule[]): boolean => {
  if (
    !(
      desired.length === existing.length &&
      !desired.find((r, i) => !isRuleEqual(r, existing[i]))
    )
  ) {
    return false;
  }

  return true;
};

const isRuleEqual = (desired: Rule, existing: Rule): boolean => {
  return (
    desired.alert === existing.alert &&
    desired.expr === existing.expr &&
    desired.for === existing.for &&
    desired.record === existing.record &&
    isDeepStrictEqual(desired.labels, existing.labels) &&
    isDeepStrictEqual(desired.annotations, existing.annotations)
  );
};
