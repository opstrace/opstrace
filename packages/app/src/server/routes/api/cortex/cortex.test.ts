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
import supertest from "supertest";
import express from "express";
import nock from "nock";

import createCortexHandler from ".";

jest.mock("../../../env", () => ({}));

beforeEach(() => {
  nock.cleanAll();
});

const getTestServer = () => {
  const server = express();
  server.use(createCortexHandler());
  return supertest(server);
};

describe("cortex api", () => {
  describe.each([
    [
      `/ingester/ring`,
      `http://ruler.cortex.svc.cluster.local`,
      "/ingester/ring"
    ],
    [`/ruler/ring`, `http://ruler.cortex.svc.cluster.local`, `/ruler/ring`],
    [
      `/compactor/ring`,
      `http://compactor.cortex.svc.cluster.local`,
      `/compactor/ring`
    ],
    [
      `/store-gateway/ring`,
      `http://store-gateway.cortex.svc.cluster.local`,
      `/store-gateway/ring`
    ],
    [
      `/alertmanager/ring`,
      `http://alertmanager.cortex.svc.cluster.local`,
      `/multitenant_alertmanager/ring`
    ]
  ])("%s", (endpoint, proxyDestination, route) => {
    test("proxies request", async () => {
      const mockResponse = { my: "response" };
      nock(proxyDestination).get(route).reply(200, mockResponse);

      const result = await getTestServer().get(endpoint);
      expect(JSON.parse(result.text)).toEqual(mockResponse);
    });

    test("handle HTML errors", async () => {
      const errorMessage = "My Error Message."
      const mockResponse = `
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Cortex Some Ring</title>
        </head>
        <body>
          <h1>Cortex Some Ring</h1>
          <p>${errorMessage}</p>
        </body>
      </html>
      `;
      nock(proxyDestination).get(route).reply(200, mockResponse, {
        'Content-Type': "text/html; charset=utf-8",
      });

      const result = await getTestServer().get(endpoint);
      expect(result.text).toEqual(errorMessage);
    });
  });
});
