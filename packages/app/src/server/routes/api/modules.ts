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
import { v4 as uuidv4 } from "uuid";
import express, { NextFunction, Request, Response } from "express";
import { Service, startService } from "esbuild";
import { GeneralServerError, PayloadValidationError } from "server/errors";
import {
  CreateModuleRequestPayload,
  createModuleRequestSchema
} from "state/module/types";
import graphqlClient from "state/graphqlClient";
import { log } from "@opstrace/utils/lib/log";
import { putObjects } from "server/middleware/s3Client";
import { getFileUri } from "state/file/utils/uri";
import { File } from "state/file/types";

let esbuildService: Service | null = null;

interface CompileOptions {
  contents: string;
  sourcefile: string;
}

export async function compileScript({ contents, sourcefile }: CompileOptions) {
  esbuildService = esbuildService || (await startService());

  const { js, jsSourceMap, warnings } = await esbuildService!.transform(
    contents,
    {
      loader: "tsx",
      sourcefile,
      sourcemap: "external"
    }
  );

  for (const warning of warnings) {
    log.info(`${sourcefile}: ${warning.text}`);
  }

  return {
    js: js || "",
    map: jsSourceMap,
    warnings
  };
}

async function createModule(req: Request, res: Response, next: NextFunction) {
  let payload: CreateModuleRequestPayload;
  try {
    payload = await createModuleRequestSchema.validate(req.body);
  } catch (validationError) {
    return next(new PayloadValidationError(validationError));
  }
  const query = await graphqlClient.GetModule(payload);

  if (query.data?.module_by_pk) {
    return next(new GeneralServerError(409, "module already exists"));
  }
  if (query.data?.branch_by_pk?.protected) {
    return next(
      new GeneralServerError(
        400,
        `cannot create module in protected branch: ${payload.branch}`
      )
    );
  }
  const fileVersion = "0.0.0-snap.0";
  const filesToCreate: { contents: string; file: File }[] = [
    {
      contents: `/**
    * ###################
    * 
    * Module Dependencies
    * 
    * ###################
    */
   
    `,
      file: {
        id: uuidv4(),
        ext: "ts",
        path: "dependencies",
        module_version: fileVersion,
        branch_name: payload.branch,
        module_name: payload.name,
        module_scope: payload.scope,
        mark_deleted: false,
        is_modified: true,
        created_at: new Date().toISOString()
      }
    },
    {
      contents: `/**
    * ####
    * 
    * Main
    * 
    * ####
    */
   
    `,
      file: {
        id: uuidv4(),
        ext: "tsx",
        path: "main",
        module_version: fileVersion,
        branch_name: payload.branch,
        module_name: payload.name,
        module_scope: payload.scope,
        mark_deleted: false,
        is_modified: true,
        created_at: new Date().toISOString()
      }
    }
  ];

  // Create files in storage bucket
  await putObjects(
    req.s3Client,
    filesToCreate.map(f => ({ path: getFileUri(f.file), contents: f.contents }))
  );
  // Finally add to our index
  await graphqlClient.CreateModule({
    ...payload,
    version: fileVersion,
    files: filesToCreate.map(f => f.file)
  });
  res.sendStatus(200);
}

function createModuleHandler() {
  const router = express.Router();

  router.post("/", createModule);
  // add a catch all for misconfigured requests
  router.all("*", function(req, res, next) {
    next(new GeneralServerError(404, "module not found"));
  });

  return router;
}

export default createModuleHandler;
