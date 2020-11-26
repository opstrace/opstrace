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
import httpProxy from "http-proxy";
import express from "express";

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

function graphql(): express.Router {
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

export default graphql;
