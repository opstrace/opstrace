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

import { onProxyReq } from "server/utils";
import { log } from "@opstrace/utils/lib/log";

export const lokiProxy = httpProxy.createProxyServer({ ignorePath: true });
/**
 * bodyParser middleware (which we use earlier in chain to parse POST body content), doesn't play
 * well with the http-proxy, since the body is parsed and altered. It results in POSTs hanging until the connection times out.
 *
 * This is a workaround to restream the already parsed body, for the proxy target to consume.
 */
lokiProxy.on("proxyReq", onProxyReq);

const proxyTo = (target: string) => (
  req: express.Request,
  res: express.Response
) => {
  return lokiProxy.web(
    req,
    res,
    {
      target,
      headers: req.params.tenant
        ? {
            "X-Scope-OrgID": req.params.tenant
          }
        : {}
    },
    (err: Error) => {
      log.warning("error in http loki proxy upstream (ignoring): %s", err);
    }
  );
};

export default function createLokiHandler(): express.Router {
  const loki = express.Router();

  // ring health
  loki.use(
    `/ingester/ring`,
    proxyTo(`http://distributor.loki.svc.cluster.local:1080/ring`)
  );
  // We haven't enabled the Ruler for Loki yet
  // loki.use(
  //   `/ruler/ring`,
  //   proxyTo(`http://distributor.loki.svc.cluster.local/ruler:1080/ruler/ring`)
  // );

  return loki;
}
