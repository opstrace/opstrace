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

import { log } from "@opstrace/utils/lib/log";
import { onProxyReq } from "server/utils";

export const cortexProxy = httpProxy.createProxyServer({ ignorePath: true });

cortexProxy.on("proxyReq", onProxyReq);

const proxyTo = (target: string) => (
  req: express.Request,
  res: express.Response
) => {
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

  // only available if -runtime-config.file specified when running cortex components https://cortexmetrics.io/docs/api/#runtime-configuration
  cortex.use(
    "/runtime_config",
    proxyTo(`http://ruler.cortex.svc.cluster.local/runtime_config`)
  );

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
  // cortex.use(`/alertmanager/ring`, proxyTo(`http://alertmanager.cortex.svc.cluster.local/multitenant_alertmanager/ring`)) // sharding currenctly disabled

  return cortex;
}
