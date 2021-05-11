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

import { V1Prometheusrule } from "..";
import { isPrometheusRuleEqual } from "./PrometheusRule";

// mock logger
jest.mock("@opstrace/utils", () => ({
  log: {
    debug: jest.fn
  }
}));

type Group = NonNullable<V1Prometheusrule["spec"]["groups"]>[number];
type Rule = Group["rules"][number];

function generateRule(template: Partial<Rule> = {}): Rule {
  return {
    alert: "my alert",
    annotations: {
      my: "annotation"
    },
    expr: "1234567",
    for: "me",
    labels: {
      my: "label"
    },
    record: "my-record",
    something: "else",
    ...template
  };
}

function generateRuleGroup(): Group {
  return {
    interval: "1000",
    name: "My Group",
    rules: [generateRule()]
  };
}

// return an empty certificate for testing
function generatePrometheusRule(
  template: Partial<V1Prometheusrule> = {}
): V1Prometheusrule {
  return {
    metadata: {
      /* start default metadata */
      generation: 1,
      resourceVersion: "1234",
      selfLink: "/random/string",
      uid: "randomstring",
      /* end default metadata */
      annotations: {
        some: "annotation"
      },
      labels: {
        some: "label"
      }
    },
    spec: {
      groups: [generateRuleGroup()]
    },
    ...template
  };
}

test("should return true when spec does match", () => {
  const desired = generatePrometheusRule();
  const existing = generatePrometheusRule();

  expect(isPrometheusRuleEqual(desired, existing)).toBe(true);
});

test("should return true when spec matches and default metatada is set", () => {
  const desired = generatePrometheusRule({
    metadata: {
      generation: 1,
      resourceVersion: "1234",
      selfLink: "/random/string",
      uid: "randomstring"
    }
  });
  const existing = generatePrometheusRule({
    metadata: {
      generation: 2,
      resourceVersion: "5678",
      selfLink: "/even/more/random/string",
      uid: "evenmorerandomstring"
    }
  });
  expect(isPrometheusRuleEqual(desired, existing)).toBe(true);
});

describe("should return false when rules in groups differ", () => {
  it("different amount of rules", () => {
    const existing = generatePrometheusRule();
    const desired = generatePrometheusRule();

    existing.spec.groups![0].rules = [generateRule()];
    desired.spec.groups![0].rules = [generateRule(), generateRule()];

    expect(isPrometheusRuleEqual(desired, existing)).toBe(false);
  });

  it("different labels", () => {
    const existing = generatePrometheusRule();
    const desired = generatePrometheusRule();

    const existingRule = generateRule();
    const desiredRule = generateRule({
      labels: {
        different: "labels"
      }
    });

    existing.spec.groups![0].rules = [existingRule];
    desired.spec.groups![0].rules = [desiredRule];

    expect(isPrometheusRuleEqual(desired, existing)).toBe(false);
  });

  it("different annotations", () => {
    const existing = generatePrometheusRule();
    const desired = generatePrometheusRule();

    const existingRule = generateRule();
    const desiredRule = generateRule({
      annotations: {
        different: "labels"
      }
    });

    existing.spec.groups![0].rules = [existingRule];
    desired.spec.groups![0].rules = [desiredRule];

    expect(isPrometheusRuleEqual(desired, existing)).toBe(false);
  });
});
