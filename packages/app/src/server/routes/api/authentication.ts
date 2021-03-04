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
import jwt from "express-jwt";
import jwksRsa from "jwks-rsa";
import { log } from "@opstrace/utils/lib/log";
import graphqlClient from "state/clients/graphqlClient";
import env from "server/env";
import { GeneralServerError, UnexpectedServerError } from "server/errors";
import authRequired from "server/middleware/auth";
// import { User } from "state/user/types";

// Authorization middleware. When used, the
// Access Token must exist and be verified against
// the Auth0 JSON Web Key Set
const checkJwt = jwt({
  // Dynamically provide a signing key
  // based on the kid in the header and
  // the signing keys provided by the JWKS endpoint.
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${env.AUTH0_DOMAIN}/.well-known/jwks.json`
  }),

  // Validate the audience and the issuer.
  audience: "https://user-cluster.opstrace.io/api",
  issuer: `https://${env.AUTH0_DOMAIN}/`,
  algorithms: ["RS256"]
});

function createAuthHandler(): express.Router {
  const auth = express.Router();
  // endpoint for creating a session so we don't have to
  // pass JWTs to every API request.
  auth.post("/session", checkJwt, async (req, res, next) => {
    const email = req.body.email;
    const username = req.body.username;
    const avatar = req.body.avatar;

    if (!email || !username || !avatar) {
      return next(new GeneralServerError(400, "incomplete payload"));
    }
    // check if user exists in db
    try {
      const response = await graphqlClient.GetActiveUserForAuth({
        email: email
      });
      let activeUserCount = response.data?.active_user_count?.aggregate?.count;
      let user = response.data?.user[0];

      if (activeUserCount === 0) {
        // if there are no active users then the first in gets setup with a user record, all subsequent "users" from auth0 are blocked
        const createResponse = await graphqlClient.CreateUser({
          email,
          username,
          avatar
        });

        user = <any>createResponse.data?.insert_user_preference_one?.user;
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

      log.info("updating session with: %s", req.body);
    } catch (err) {
      return next(new UnexpectedServerError(err));
    }

    res.sendStatus(200);
  });

  // Allow clients to request data about the current user
  auth.get("/session", authRequired, async (req, res) => {
    res.status(200).json({
      uid: req.session.userId
    });
  });

  auth.get("/logout", (req, res) => {
    req.session.destroy(() => {
      // session can be undefined if we've already terminated it.
      // if already terminated then still perform the flow with Auth0
      // so we log out of Auth0 and get the redirect back to our UI
      req.session &&
        log.info("terminated session for user: %s", req.session.email);
      // logout of Auth0
      res.redirect(
        `https://${env.AUTH0_DOMAIN}/v2/logout?client_id=${
          env.AUTH0_CLIENT_ID
        }&returnTo=${encodeURIComponent(env.UI_DOMAIN)}`
      );
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

export default createAuthHandler;
