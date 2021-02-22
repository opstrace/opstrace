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
import { getSDKFiles } from "sdk";

// Get the lib files at startup
const libFiles = getSDKFiles();

function createModuleHandler() {
  const router = express.Router();

  router.get("/opstrace.lib.d.ts", async function (req, res, next) {
    res.sendFile(
      path.resolve(process.cwd(), "lib/opstrace.lib.d.ts"),
      {
        headers: {
          "Content-Disposition": "inline",
          "content-type": "text/html"
        }
      },
      (err?: any) => {
        if (err) {
          next(err);
        }
      }
    );
  });

  router.get("/opstrace.lib.filelist", async function (req, res, next) {
    const files = libFiles;

    res.status(200).send({ files });
  });

  // add a catch all for misconfigured requests
  router.all("*", function (req, res, next) {
    next(new GeneralServerError(404, "module not found"));
  });

  return router;
}

export default createModuleHandler;
