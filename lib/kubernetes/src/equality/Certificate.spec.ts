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

import { V1Certificate } from "../custom-resources";
import { isCertificateEqual } from "./Certificate";

// mock logger
jest.mock("@opstrace/utils", () => ({
  log: {
    debug: jest.fn
  }
}));

// return an empty certificate for testing
function genCert(template: Partial<V1Certificate> = {}): V1Certificate {
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
      issuerRef: {
        name: "test"
      },
      secretName: "test"
    },
    ...template
  };
}

test("should return true when certificates are empty", () => {
  const desired = genCert();
  const existing = genCert();

  expect(isCertificateEqual(desired, existing)).toBe(true);
});

test("should return true when certificates match", () => {
  const desired = genCert();
  const existing = genCert();

  desired.metadata = {
    annotations: {
      foo: "foo"
    }
  };
  existing.metadata = {
    annotations: {
      foo: "foo"
    }
  };

  expect(isCertificateEqual(desired, existing)).toBe(true);
});

test("should return true when spec matches and default metatada is set", () => {
  const desired = genCert({
    metadata: {
      generation: 1,
      resourceVersion: "1234",
      selfLink: "/random/string",
      uid: "randomstring"
    }
  });
  const existing = genCert({
    metadata: {
      generation: 2,
      resourceVersion: "5678",
      selfLink: "/even/more/random/string",
      uid: "evenmorerandomstring"
    }
  });
  expect(isCertificateEqual(desired, existing)).toBe(true);
});

test("should not be equal when certificate annotations do not match", () => {
  const desired = genCert();
  const existing = genCert();

  desired.metadata = {
    annotations: {
      foo: "bar"
    }
  };
  existing.metadata = {
    annotations: {
      bar: "foo"
    }
  };

  expect(isCertificateEqual(desired, existing)).toBe(false);
});

test("should not be equal when certificate commonName does not match", () => {
  const desired = genCert();
  const existing = genCert();

  desired.spec.commonName = "bar";
  existing.spec.commonName = "foo";

  expect(isCertificateEqual(desired, existing)).toBe(false);
});

test("should not be equal when certificate dnsNames does not match", () => {
  const desired = genCert();
  const existing = genCert();

  desired.spec.dnsNames = ["bar"];
  existing.spec.dnsNames = ["foo"];

  expect(isCertificateEqual(desired, existing)).toBe(false);
});

test("should not be equal when certificate isCa does not match", () => {
  const desired = genCert();
  const existing = genCert();

  desired.spec.isCA = false;
  existing.spec.isCA = true;

  expect(isCertificateEqual(desired, existing)).toBe(false);
});

test("should not be equal when certificate issuerRef does not match", () => {
  const desired = genCert();
  const existing = genCert();

  desired.spec.issuerRef = {
    name: "foo"
  };
  existing.spec.issuerRef = {
    name: "bar"
  };
  expect(isCertificateEqual(desired, existing)).toBe(false);

  desired.spec.issuerRef = {
    name: "test",
    kind: "foo"
  };
  existing.spec.issuerRef = {
    name: "test",
    kind: "bar"
  };
  expect(isCertificateEqual(desired, existing)).toBe(false);
});

test("should not be equal when certificate secretName does not match", () => {
  const desired = genCert();
  const existing = genCert();

  desired.spec.secretName = "foo";
  existing.spec.secretName = "bar";
  expect(isCertificateEqual(desired, existing)).toBe(false);
});
