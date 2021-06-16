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
import setCortexRuntimeConfigHandler, {
  readCortexRuntimeConfigHandler
} from "./cortexRuntimeConfig";
import { parse } from "node-html-parser";

export const cortexProxy = httpProxy.createProxyServer({ ignorePath: true });
/**
 * bodyParser middleware (which we use earlier in chain to parse POST body content), doesn't play
 * well with the http-proxy, since the body is parsed and altered. It results in POSTs hanging until the connection times out.
 *
 * This is a workaround to restream the already parsed body, for the proxy target to consume.
 */
cortexProxy.on("proxyReq", onProxyReq);

cortexProxy.on("proxyRes", (proxyRes, req, res) => {
  const isHTMLResponse = proxyRes.headers["content-type"]?.includes("text/html")
  const body: Array<any> = [];
  res.writeHead(proxyRes.statusCode!, proxyRes.headers);
  proxyRes.on("data", function (chunk) {
    if (!isHTMLResponse) {
      res.write(chunk)
    }
    body.push(chunk)
  });
  proxyRes.on("end", function () {
    if (isHTMLResponse) {
      /* Some error messages are returned via HTML.
       * We have mainly seen it with configuration errors, e.g. when sharding 
       * is disabled. 
       *
       * For example HTML responses please check the tests.
       */
      const parsedHTML = parse(body);
      const data = parsedHTML.querySelector("p").text;
      res.end(data);
    } else {
      res.end();
    }
  })
});

const proxyTo = (target: string) => (
  req: express.Request,
  res: express.Response
) => {
  return cortexProxy.web(
    req,
    res,
    {
      selfHandleResponse: true,
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
};

export default function createCortexHandler(): express.Router {
  const cortex = express.Router();

  // https://cortexmetrics.io/docs/api/#ruler

  cortex.use(
    "/:tenant/api/v1/alerts",
    proxyTo("http://ruler.cortex.svc.cluster.local/api/v1/alerts")
  );

  cortex.use(
    "/:tenant/api/v1/rules",
    proxyTo("http://ruler.cortex.svc.cluster.local/api/v1/rules")
  );

  cortex.use("/:tenant/api/v1/rules/:namespace", (req, res) => {
    proxyTo(
      `http://ruler.cortex.svc.cluster.local/api/v1/rules/${req.params.namespace}`
    )(req, res);
  });

  cortex.use("/:tenant/api/v1/rules/:namespace/:group", (req, res) => {
    proxyTo(
      `http://ruler.cortex.svc.cluster.local/api/v1/rules/${req.params.namespace}/${req.params.group}`
    )(req, res);
  });

  // ring health
  cortex.use(
    `/ingester/ring`,
    proxyTo(`http://ruler.cortex.svc.cluster.local/ingester/ring`)
  );
  cortex.use(
    `/ruler/ring`,
    proxyTo(`http://ruler.cortex.svc.cluster.local/ruler/ring`)
  );
  cortex.use(
    `/compactor/ring`,
    proxyTo(`http://compactor.cortex.svc.cluster.local/compactor/ring`)
  );
  cortex.use(
    `/store-gateway/ring`,
    proxyTo(`http://store-gateway.cortex.svc.cluster.local/store-gateway/ring`)
  );
  cortex.use(
    `/alertmanager/ring`,
    proxyTo(
      `http://alertmanager.cortex.svc.cluster.local/multitenant_alertmanager/ring`
    )
  );

  // Being able to access this implies having access to cortex config for
  // all tenants, i.e. this is a privileged / superuser action.
  cortex.post("/runtime_config", setCortexRuntimeConfigHandler);

  // This is the runtime config as set in the config map
  cortex.get("/runtime_config_file", readCortexRuntimeConfigHandler);

  // This is the runtime config as recognized by cortex. Cortex can take up to runtime_config.period to load
  cortex.get(
    "/runtime_config",
    proxyTo(`http://ruler.cortex.svc.cluster.local/runtime_config`)
  );

  // All Cortex config
  cortex.get(
    "/config",
    proxyTo(`http://ingester.cortex.svc.cluster.local/config`)
  );

  return cortex;
}
