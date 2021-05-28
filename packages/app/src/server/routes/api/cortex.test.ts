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

import createCortexHandler from "./cortex";

beforeEach(() => {
  nock.cleanAll();
});

const getTestServer = () => {
  const server = express();
  server.use(createCortexHandler());
  return supertest(server);
};

describe("cortex api", () => {
  describe("ring health", () => {
    test.each([
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
      ]
    ])("%s", async (endpoint, proxyDestination, route) => {
      const mockResponse = "<div>markup response</div>";
      nock(proxyDestination).get(route).reply(200, mockResponse);

      const result = await getTestServer().get(endpoint);
      expect(result.text).toBe(mockResponse);
    });
  });
});
