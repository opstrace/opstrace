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
import express, { NextFunction } from "express";
// import { Service, startService } from "esbuild";
// import path from 'path';
import { Request, Response } from "express";
import { GeneralServerError } from "server/errors";
// import { log } from "@opstrace/utils/lib/log";
import resolveFile from "./lib-compiler";

// import db from "@opstrace/ui-kit/lib/state/client";

// let esbuildService: Service | null = null;

// interface CompileOptions {
//   filePath: string;
// }

// export async function compileUserModule({ filePath }: CompileOptions) {
//   esbuildService = esbuildService || (await startService());
//   const contents = await fs.readFile(filePath, "utf-8");

//   const { js, jsSourceMap, warnings } = await esbuildService!.transform(
//     contents,
//     {
//       loader: "tsx",
//       sourcefile: filePath,
//       sourcemap: "external"
//     }
//   );

//   for (const warning of warnings) {
//     log.info(`${filePath}
// ${warning.text}`);
//   }

//   return {
//     code: js || "",
//     map: jsSourceMap,
//     warnings
//   };
// }

async function opstraceFileHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.params.library) {
      res.sendStatus(404);
    }
    const modulePath = await resolveFile(req.params.library, req.url);

    if (modulePath) {
      res.sendFile(modulePath, {
        maxAge: 0 //TODO: configure appropriate caching
      });
    } else {
      res.sendStatus(404);
    }
  } catch (err) {
    next(err);
  }
}

function modules({ maxAge }: { maxAge: number }) {
  const router = express.Router();
  // use /lib and /src so our sourcemaps remain useful
  router.use("/@opstrace/:library/lib", opstraceFileHandler);
  router.use("/@opstrace/:library/src", opstraceFileHandler);

  // add a catch all for misconfigured requests
  router.all("*", function (req, res, next) {
    next(new GeneralServerError(404, "module not found"));
  });

  return router;
}

export default modules;
