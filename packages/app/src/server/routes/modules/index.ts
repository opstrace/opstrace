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
import path from "path";
import express from "express";
import { GeneralServerError } from "server/errors";
import ModuleClient from "server/moduleClient";
import { log } from "@opstrace/utils";
import { parseFileImportUri } from "state/file/utils/uri";
import graphqlClient from "state/clients/graphqlClient";

function createCacheableModuleServingHandler({ maxAge }: { maxAge: number }) {
  const router = express.Router();

  router.get("*", async function (req, res, next) {
    try {
      const moduleClient = new ModuleClient();
      const fileAttrs = parseFileImportUri(req.url);

      if (!fileAttrs) {
        return next(new GeneralServerError(404, "not found"));
      }

      if (fileAttrs.external && fileAttrs.module_name === "sdk") {
        res.sendFile(
          path.resolve(
            process.cwd(),
            "lib",
            fileAttrs.path + "." + fileAttrs.ext
          ),
          {
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Content-Disposition": "inline"
            }
          },
          (err?: any) => {
            if (err) {
              next(err);
            }
          }
        );

        return;
      }
      // TODO: cache this so we don't have to hit the db on every HMR during module development
      let fileRes = await graphqlClient.GetFileId({
        branch: fileAttrs.branch_name,
        module: fileAttrs.module_name,
        scope: fileAttrs.module_scope,
        version: fileAttrs.module_version,
        path: fileAttrs.path
      });
      const data = fileRes.data?.file;
      if (!data || data.length === 0) {
        return next(new GeneralServerError(404, "not found"));
      }
      // prioritize the file that is not on the main branch
      const fileId =
        data.length > 1
          ? data.find(d => d.branch_name !== "main")?.id
          : data[0].id;
      const compilerOutput = await moduleClient.getCompilerOutput(fileId);

      let contents: string = "";
      let contentType: string = "";

      if (fileAttrs.ext === "map") {
        contents = compilerOutput.sourceMap || "";
        contentType = "application/json"; // so it can be viewed in the console
      } else if (fileAttrs.ext === "js") {
        contents = compilerOutput.js || "";
        contentType = "application/javascript";
      } else if (fileAttrs.ext === "d.ts") {
        contents = compilerOutput.dts || "";
        contentType = "application/text";
      }

      if (!contents || !contentType) {
        return next(new GeneralServerError(404, "not found"));
      }

      res.set("Content-Disposition", "inline");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("content-type", contentType);
      res.status(200).send(contents);
    } catch (err) {
      log.error(`fetching file failed [${req.url}]: %s`, err);
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
