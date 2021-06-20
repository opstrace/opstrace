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

const { configure } = require("@testing-library/react");
const nock = require("nock");

require("regenerator-runtime/runtime");
// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
require("@testing-library/jest-dom/extend-expect");

// Mock our workers file because Jest will have a hard time resolving our workers
jest.mock("workers", () => {
  return {
    getOpScriptWorker: () => {}
  };
});

jest.setTimeout(15000)
configure({
  asyncUtilTimeout: 15000
})
/* limiting net requests to localhost, see
 * https://github.com/nock/nock#enabledisable-real-http-requests
 */
nock.disableNetConnect()
nock.enableNetConnect(
  host => host.includes('127.0.0.1') || host.includes('localhost')
)