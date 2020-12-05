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
import redis from "redis";

import expressSession from "express-session";
import cookieParser from "cookie-parser";
import env, { isDevEnvironment } from "server/env";

const RedisStore = require("connect-redis")(expressSession);

// Default to in-memory store - useful for dev
let store:
  | expressSession.MemoryStore
  | typeof RedisStore = new expressSession.MemoryStore();
// If we have Redis connection config, create a Redis store for the session backend
if (env.REDIS_HOST) {
  store = new RedisStore({
    client: redis.createClient({
      host: env.REDIS_HOST,
      password: env.REDIS_PASSWORD
    })
  });
}

const session = expressSession({
  name: "opstrace.sid",
  store: store,
  secret: env.COOKIE_SECRET,
  resave: true,
  saveUninitialized: false,
  cookie: isDevEnvironment
    ? {}
    : {
        secure: true,
        httpOnly: true,
        domain: `.${env.UI_DOMAIN.replace("https://", "")}`
      } // make cookies secure and available on the UI_DOMAIN and *.UI_DOMAIN (for Grafana)
});

function sessionParser(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  return cookieParser(env.COOKIE_SECRET)(req, res, () => {
    session(req, res, next);
  });
}

export default sessionParser;
