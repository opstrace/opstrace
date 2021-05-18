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
import querystring from "querystring";

import { log } from "@opstrace/utils/lib/log";

export const cortexProxy = httpProxy.createProxyServer({ ignorePath: true });
/**
 * bodyParser middleware (which we use earlier in chain to parse POST body content), doesn't play
 * well with the http-proxy, since the body is parsed and altered. It results in POSTs hanging until the connection times out.
 *
 * This is a workaround to restream the already parsed body, for the proxy target to consume.
 */
cortexProxy.on("proxyReq", function onProxyReq(proxyReq, req, res) {
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

function proxyTo(target: string, req: express.Request, res: express.Response) {
  return cortexProxy.web(
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
      log.warning("error in http cortex proxy upstream (ignoring): %s", err);
    }
  );
}

export default function createCortexHandler(): express.Router {
  const cortex = express.Router();
  // https://cortexmetrics.io/docs/api/#ruler

  cortex.use("/:tenant/api/v1/alerts", (req, res) => {
    proxyTo("http://ruler.cortex.svc.cluster.local/api/v1/alerts", req, res);
  });

  cortex.use("/:tenant/api/v1/rules", (req, res) => {
    proxyTo("http://ruler.cortex.svc.cluster.local/api/v1/rules", req, res);
  });

  cortex.use("/:tenant/api/v1/rules/:namespace", (req, res) => {
    proxyTo(
      `http://ruler.cortex.svc.cluster.local/api/v1/rules/${req.params.namespace}`,
      req,
      res
    );
  });

  cortex.use("/:tenant/api/v1/rules/:namespace/:group", (req, res) => {
    proxyTo(
      `http://ruler.cortex.svc.cluster.local/api/v1/rules/${req.params.namespace}/${req.params.group}`,
      req,
      res
    );
  });

  // only available if -runtime-config.file specified when running cortex components https://cortexmetrics.io/docs/api/#runtime-configuration
  cortex.use("/runtime_config", (req, res) => {
    proxyTo(`http://ruler.cortex.svc.cluster.local/runtime_config`, req, res);
  });

  return cortex;
}
