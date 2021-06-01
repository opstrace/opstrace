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
 * distributed under the License is d/**
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

import { parseEnv, parseRequiredEnv } from "./envParsers";

describe("envParser", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  describe("parseEnv", () => {
    it("parses env variables", () => {
      const myEnvVarName = "MY_ENV";
      const myEnvVarValue = "my-env-value";

      process.env[myEnvVarName] = myEnvVarValue;

      const result = parseEnv(myEnvVarName, String, "");

      expect(result).toBe(myEnvVarValue);
    });

    it("defaults to default value", () => {
      const myEnvVarName = "MY_ENV";
      const defaultValue = "my-default-value";

      const result = parseEnv(myEnvVarName, String, defaultValue);

      expect(result).toBe(defaultValue);
    });

    it("parses values to correct type", () => {
      const myEnvVarName = "MY_ENV";
      const myEnvVarValue = "123";

      process.env[myEnvVarName] = myEnvVarValue;

      const result = parseEnv(myEnvVarName, Number, 0);

      expect(typeof result).toBe("number");
      expect(result).toBe(123);
    });
  });

  describe("parseRequiredEnv", () => {
    it("parses env variables", () => {
      const myEnvVarName = "MY_ENV";
      const myEnvVarValue = "my-env-value";

      process.env[myEnvVarName] = myEnvVarValue;

      const result = parseRequiredEnv(myEnvVarName, String);

      expect(result).toBe(myEnvVarValue);
    });

    it("parses values to correct type", () => {
      const myEnvVarName = "MY_ENV";
      const myEnvVarValue = "my env value";

      process.env[myEnvVarName] = myEnvVarValue;

      const result = parseRequiredEnv(
        myEnvVarName,
        val => val === myEnvVarValue
      );

      expect(typeof result).toBe("boolean");
      expect(result).toBe(true);
    });

    it("throws error if not provided", () => {
      const myEnvVarName = "MY_ENV";

      expect(() => {
        parseRequiredEnv(myEnvVarName, String);
      }).toThrowError(`must provide env vars: ${myEnvVarName}`);
    });

    it("throws custom error message", () => {
      const customErrorMessage = "I AM A CUSTOM ERROR MESSAGE!";

      expect(() => {
        parseRequiredEnv("SOME_ENV", String, customErrorMessage);
      }).toThrowError(customErrorMessage);
    });
  });
});
