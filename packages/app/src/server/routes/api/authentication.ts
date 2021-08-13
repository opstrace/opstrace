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

import axios from "axios";
import express from "express";
import jwt from "express-jwt";
import jwksRsa from "jwks-rsa";

import env from "server/env";
import { GeneralServerError, UnexpectedServerError } from "server/errors";
import { log } from "@opstrace/utils/lib/log";
import authRequired from "server/middleware/auth";

import graphqlClient from "state/clients/graphqlClient";

import { AUTH0_CONFIG } from "./uicfg";
import { BUILD_INFO } from "@opstrace/utils";

import * as jwkshelpers from "./jwks";

// Use something like this for testing error handling.
//const JWKS_URL = `http://httpbin.org/delay/10`;
//const JWKS_URL = `http://httpbin.org/status/504`;
//const JWKS_URL = `http://httpbin.org/status/408,413,429,500,502,503,504,521,522,524`;
const JWKS_URL = `https://${env.AUTH0_DOMAIN}/.well-known/jwks.json`;

// Middleware for verification of the Auth0-emitted access token that is sent
// as _login_ credential.
const checkAccessTokenForLogin = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: JWKS_URL,
    // use a rather short item lifetime for now, as of
    // https://github.com/auth0/node-jwks-rsa/issues/257
    cacheMaxAge: 60000,
    // Override fetcher function, see
    // https://github.com/auth0/node-jwks-rsa/blob/cd52aa297756bc097e45f59a8ee216c69a2e1704/src/wrappers/request.js#L7
    //@ts-ignore: type not up to date
    fetcher: jwkshelpers.fetch
    //handleSigningKeyError: errhandler
  }),

  // Validate the audience and the issuer.
  audience: "https://user-cluster.opstrace.io/api",
  issuer: `https://${env.AUTH0_DOMAIN}/`,
  algorithms: ["RS256"]
});

function createAuthHandler(): express.Router {
  const auth = express.Router();
  // Note(JP): think of this as a _login_ endpoint, exchanging primary
  // credential (here: Auth0-emitted access token) into a secondary credential
  // (here: session identifier, wrapped in cookie)
  auth.post("/session", checkAccessTokenForLogin, async (req, res, next) => {
    // Note(JP): TODO: clarify which errors this may throw, and for some of
    // them maybe also emit a proper 401 response.
    const { email, username, avatar } = await loadUserInfo(
      // @ts-ignore Object is possibly 'undefined'
      req.headers.authorization.split(" ")[1]
    );

    if (!email || !username || !avatar) {
      return next(new GeneralServerError(400, "incomplete payload"));
    }

    let user = undefined;
    try {
      // check if user exists in db
      const response = await graphqlClient.GetActiveUserForAuth({
        email: email
      });
      let activeUserCount = response.data?.active_user_count?.aggregate?.count;
      user = response.data?.user[0];

      if (activeUserCount === 0) {
        // if there are no active users then the first in gets setup with a user record, all subsequent "users" from auth0 are blocked
        const createResponse = await graphqlClient.CreateUser({
          email,
          username,
          avatar
        });

        user = createResponse.data?.insert_user_preference_one?.user as any;
      } else if (!user) {
        return next(new GeneralServerError(401, "Unauthorized"));
      } else {
        await graphqlClient.UpdateUserSession({
          id: user.id,
          timestamp: new Date().toISOString()
        });
      }

      // block login attempt if we somehow got to here without a valid active user
      if (!user || !user.active)
        return next(new GeneralServerError(401, "Unauthorized"));

      req.session.userId = user.id;
      req.session.email = email;
      req.session.username = username;
      req.session.avatar = avatar;

      res.status(200).json({ currentUserId: user.id });

      log.info("updating session with: %s", req.body);
    } catch (err) {
      return next(new UnexpectedServerError(err));
    }
  });

  // Allow clients to request data about the current user
  auth.get("/session", authRequired, async (req, res) => {
    res.status(200).json({
      currentUserId: req.session.userId
    });
  });

  auth.get("/status", (req, res) => {
    res.status(200).json({
      currentUserId: req.session?.userId,
      auth0Config: {
        domain: AUTH0_CONFIG.auth0_domain,
        clientId: AUTH0_CONFIG.auth0_client_id
      },
      buildInfo: {
        branch: BUILD_INFO.BRANCH_NAME,
        version: BUILD_INFO.VERSION_STRING,
        commit: BUILD_INFO.COMMIT,
        buildTime: BUILD_INFO.BUILD_TIME_RFC3339,
        buildHostname: BUILD_INFO.BUILD_HOSTNAME
      }
    });
  });

  auth.post("/logout", authRequired, async (req, res) => {
    req.session.destroy(() => {
      res.clearCookie("opstrace.sid");
      // session can be undefined if we've already terminated it.
      // if already terminated then still perform the flow with Auth0
      // so we log out of Auth0 and get the redirect back to our UI
      req.session &&
        log.info("terminated session for user: %s", req.session.email);

      res.sendStatus(200);
    });
  });

  auth.get("/nginx-ingress/webhook", authRequired, (req, res) => {
    res.setHeader("X-Auth-Request-User", req.session.userId!);
    res.setHeader("X-Auth-Request-Email", req.session.email!);
    res.sendStatus(200);
  });

  // add a catch all for misconfigured auth requests
  auth.all("*", function (req, res, next) {
    next(new GeneralServerError(404, "auth route not found"));
  });

  return auth;
}

const loadUserInfo = async (accessToken: string) => {
  const { data } = await axios.get(`https://${env.AUTH0_DOMAIN}/userinfo`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  const username = (
    data.nickname ||
    data.username ||
    data.given_name ||
    data.name ||
    ""
  ).toLowerCase();

  return { email: data.email, avatar: data.picture || "", username };
};

jwkshelpers.prepopulateZombie(JWKS_URL);

export default createAuthHandler;
