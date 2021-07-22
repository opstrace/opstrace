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
const axios = require("axios");

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

const testTimeout = 5 * 60 * 1000; // 5 mins

jest.setTimeout(testTimeout);
configure({
  asyncUtilTimeout: testTimeout
});
/* limiting net requests to localhost, see
 * https://github.com/nock/nock#enabledisable-real-http-requests
 */
nock.disableNetConnect();
nock.enableNetConnect(
  host => host.includes("127.0.0.1") || host.includes("localhost")
);

// If you are using jsdom, axios will default to using the XHR adapter which
// can't be intercepted by nock. So, configure axios to use the node adapter.
//
// References:
// https://github.com/nock/nock/issues/699#issuecomment-272708264
// https://github.com/axios/axios/issues/305
axios.defaults.adapter = require("axios/lib/adapters/http");
