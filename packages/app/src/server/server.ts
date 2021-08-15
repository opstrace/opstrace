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

import http from "http";
import path from "path";

import delay from "delay";
import express from "express";
import bodyParser from "body-parser";
import expressWinston from "express-winston";
import winston from "winston";
import * as Sentry from "@sentry/node";
import { BUILD_INFO } from "@opstrace/utils";
import helmet from "helmet";
import compression from "compression";
import { createLightship } from "lightship";

import { log, setLogger, buildLogger } from "@opstrace/utils";

import env, { isDevEnvironment } from "./env";

import api from "./routes/api";
import setupWebsocketHandling from "./routes/websockets";

import sessionParser from "./middleware/session";
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

log.info(`Starting UI web application. Build information: ${BUILD_INFO}`);

// https://github.com/gajus/lightship
const lightship = createLightship({
  signals: ["SIGINT", "SIGTERM"],
  shutdownHandlerTimeout: 60000,
  port: 9000
});

const shutdownDelay: number = isDevEnvironment ? 0 : 30000;

function createServer() {
  const app = express();

  if (!isDevEnvironment || env.ENABLE_SENTRY_FOR_LOCALHOST === "true") {
    Sentry.init({
      // todo: this should be passed in as an env var, also considere being a different project/dsn to the react client
      dsn: "https://28a6d713adde403aaaab7c7cc36f0383@o476375.ingest.sentry.io/5529515",
      initialScope: {
        tags: {
          "opstrace.branch": BUILD_INFO.BRANCH_NAME,
          "opstrace.version": BUILD_INFO.VERSION_STRING,
          "opstrace.commit": BUILD_INFO.COMMIT,
          "opstrace.build-time": BUILD_INFO.BUILD_TIME_RFC3339,
          "opstrace.build-hostname": BUILD_INFO.BUILD_HOSTNAME
        }
      }
    });

    // The request handler must be the first middleware on the app
    app.use(Sentry.Handlers.requestHandler());
  } else {
    log.info("Sentry not enabled as running on Localhost");
  }

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

  // Without this, the app would only allow for JSON request bodies. Allow for
  // passing 'text', too (for example for YAML docs).
  app.use(bodyParser.text({ type: "text/plain", defaultCharset: "utf-8" }));

  app.use(bodyParser.urlencoded({ extended: false }));

  // What is this doing really? I think this might be responsible for a log line like this:
  // 2021-08-13T07:48:06.412Z error: UNAUTHORIZED: JwksError: UNAUTHORIZED
  // Note that this is like log.error(error) -- the point is, there is no
  // string prefix. We do not have such a line of code in our code base here
  // right now.
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
  // all api routes will be prefixed with _/ which gets us around the service worker cache
  // we don't want these responses cached long term by the service worker
  app.use("/_", api());

  //@ts-ignore: implicit any
  // app.use(function (err, req, res: Response, next) {
  //   if (err.name === "UnauthorizedError") {
  //     log.info(
  //       `${req.id}: seen UnauthorizedError, send opaque 401 resp. Err detail: ${err.message}`
  //     );
  //     res.status(401).send("no valid authentication token found");
  //     return;
  //   }
  // });

  // The error handler must be before any other error middleware and after all controllers
  app.use(Sentry.Handlers.errorHandler());

  // apply post api middleware
  app.use(catchErrorsMiddleware);

  // return the app-shell for PWA Note(JP): this is 'catch-all' for e.g. /
  // (which serves the UI assets) and e.g. /login is on the one hand handled by
  // this web application here (requests to /login will show up in the access
  // log, but the interesting business logic for /login which is to terminate
  // an OIDC authorization code flowhappens client-side, in the corresponding
  // react view).
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
    `waiting ${
      shutdownDelay / 1000
    }s for connections to close before shutting down`
  );

  await delay(shutdownDelay);

  log.info("shutting down gracefully");
  server.close();
});

// Lightship default state is "SERVER_IS_NOT_READY". Therefore, you must signal
// that the server is now ready to accept connections.
lightship.signalReady();
