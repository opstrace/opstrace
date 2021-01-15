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
import express from "express";
import { GeneralServerError } from "server/errors";
// import ModuleClient from "server/moduleClient";
import { log } from "@opstrace/utils";

function createCacheableModuleServingHandler({ maxAge }: { maxAge: number }) {
  const router = express.Router();

  router.get("*", async function (req, res, next) {
    // const moduleClient = new ModuleClient();
    try {
    } catch (err) {
      log.error(`failed fetching file from s3 [${req.url}]: %s`, err);
      return next(err);
    }
  });
  // add a catch all for misconfigured requests
  router.all("*", function (req, res, next) {
    next(new GeneralServerError(404, "not found"));
  });

  return router;
}

export default createCacheableModuleServingHandler;
