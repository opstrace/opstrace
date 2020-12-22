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

/* eslint-disable import/first */
import "source-map-support/register";

import express from "express";
import delay from "delay";
import { createLightship } from "lightship";
import http from "http";
import { log, setLogger, buildLogger } from "@opstrace/utils/lib/log";
import path from "path";
import bodyParser from "body-parser";

import expressWinston from "express-winston";
import winston from "winston";
import helmet from "helmet";
import compression from "compression";

import env, { isDevEnvironment } from "./env";

import api from "./routes/api";
import modules from "./routes/modules";
import setupWebsocketHandling from "./routes/websockets";

import sessionParser from "./middleware/session";
import createS3Client from "./middleware/s3Client";
import catchErrorsMiddleware from "./middleware/error";
import serverRender from "./middleware/render";
import { GeneralServerError } from "./errors";

setLogger(
  buildLogger({
    stderrLevel: "info",
    filePath: undefined
  })
);

const oneYear = 1000 * 60 * 60 * 24 * 365;
// cache everything for one year by default
const maxAge = isDevEnvironment ? 0 : oneYear;

// https://github.com/gajus/lightship
const lightship = createLightship({
  signals: ["SIGINT", "SIGTERM"],
  shutdownHandlerTimeout: 60000,
  port: 9000
});

const shutdownDelay: number = isDevEnvironment ? 0 : 30000;

function createServer() {
  const app = express();

  app.use(helmet());
  app.use(compression());
  app.use(
    // Everything will be cached clientside for maxAge.
    express.static(path.resolve("build"), {
      maxAge: maxAge,
      index: false
    })
  );
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(
    expressWinston.logger({
      transports: [new winston.transports.Console()]
    })
  );
  if (!isDevEnvironment) {
    app.set("trust proxy", 1); // trust first hop after proxy for when this is running directly behind nginx ingress
  }
  app.use(sessionParser);

  app.use(function sessionCheck(req, res, next) {
    if (!req.session) {
      return next(
        new GeneralServerError(500, "connection to session backend lost")
      );
    }
    next();
  });

  app.use(createS3Client);
  // all api routes will be prefixed with _/ which gets us around the service worker cache
  // we don't want these responses cached long term by the service worker
  app.use("/_", api());
  // mount the module routes (responses are immutable so we can cache these long term)
  app.use("/modules", modules({ maxAge }));
  // apply post api middleware
  app.use(catchErrorsMiddleware);
  // return the app-shell for PWA
  app.use("*", serverRender);

  log.info("about to start HTTP server");
  log.info(
    "using AUTH0_DOMAIN %s and AUTH0_CLIENT_ID %s",
    env.AUTH0_DOMAIN,
    env.AUTH0_CLIENT_ID
  );

  return http
    .createServer(app)
    .listen(env.PORT, () => log.info(`server running on port: ${env.PORT}`));
}

// Create the server instance
const server = createServer();
setupWebsocketHandling(server);

lightship.registerShutdownHandler(async () => {
  // Allow sufficient amount of time to allow all of the existing
  // HTTP requests to finish before terminating the service.
  log.info(
    `waiting ${shutdownDelay /
      1000}s for connections to close before shutting down`
  );

  await delay(shutdownDelay);

  log.info("shutting down gracefully");
  server.close();
});

// Lightship default state is "SERVER_IS_NOT_READY". Therefore, you must signal
// that the server is now ready to accept connections.
lightship.signalReady();
