/**
 * Copyright 2019-2021 Opstrace, Inc.
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
import httpProxy from "http-proxy";
import express from "express";
import querystring from "querystring";
import env from "server/env";
import { log } from "@opstrace/utils/lib/log";

export function getHasuraSessionHeaders(email: string) {
  return {
    "X-Hasura-User-Id": email,
    "X-Hasura-Role": "user_admin", // Set every user by default to "user_admin" in community edition.
    "X-Hasura-Admin-Secret": env.HASURA_GRAPHQL_ADMIN_SECRET
  };
}

/**
 * Proxy to our Graphql server
 */
export const graphqlProxy = httpProxy.createProxyServer({
  target: {
    host: env.GRAPHQL_ENDPOINT_HOST,
    port: env.GRAPHQL_ENDPOINT_PORT,
    path: "/v1/graphql"
  },
  ws: true
});

/**
 * bodyParser middleware (which we use earlier in chain to parse POST body content), doesn't play
 * well with the http-proxy, since the body is parsed and altered. It results in POSTs hanging until the connection times out.
 *
 * This is a workaround to restream the already parsed body, for the proxy target to consume.
 */
graphqlProxy.on("proxyReq", function onProxyReq(proxyReq, req, res) {
  // @ts-ignore
  if (!req.body || !Object.keys(req.body).length) {
    return;
  }

  const contentType = proxyReq.getHeader("Content-Type");
  const writeBody = (bodyData: string) => {
    proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
    proxyReq.write(bodyData);
  };

  if (contentType === "application/json") {
    // @ts-ignore
    writeBody(JSON.stringify(req.body));
  }

  if (contentType === "application/x-www-form-urlencoded") {
    // @ts-ignore
    writeBody(querystring.stringify(req.body));
  }
});

function createGraphqlHandler(): express.Router {
  const graphql = express.Router();

  graphql.use("/", (req, res) => {
    if (!(req.session && req.session.email)) {
      res.sendStatus(401);
      return;
    }

    graphqlProxy.web(
      req,
      res,
      {
        headers: getHasuraSessionHeaders(req.session.email)
      },
      (err: Error) => {
        log.warning("error in http graphql proxy upstream (ignoring): %s", err);
      }
    );
  });

  return graphql;
}

export default createGraphqlHandler;
