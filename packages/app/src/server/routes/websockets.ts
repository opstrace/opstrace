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
import http from "http";
import url from "url";
import express from "express";
import sessionParser from "server/middleware/session";
import { graphqlProxy, getHasuraSessionHeaders } from "./api/graphql";
import { log } from "@opstrace/utils/lib/log";

export default function setupWebsocketHandling(server: http.Server) {
  // Listen for upgrade requests and handle appropriately
  server.on("upgrade", function upgrade(req, socket, head) {
    const pathname = url.parse(req.url).pathname;
    // https://github.com/websockets/ws/tree/3d5066a7cad9fe3176002916aeda720a7b5ee419#multiple-servers-sharing-a-single-https-server
    if (pathname === "/_/graphql") {
      // https://github.com/websockets/ws/blob/master/examples/express-session-parse/index.js
      sessionParser(req, {} as express.Response, () => {
        if (!(req.session && req.session.email)) {
          // This will show in the browser console (using the apolloClient) as "failed: HTTP Authentication failed; no valid credentials available"
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }
        graphqlProxy.ws(
          req,
          socket,
          head,
          {
            ignorePath: true,
            headers: getHasuraSessionHeaders(req.session.email)
          },
          (err: Error) => {
            log.warning(
              "error in graphql websocket proxy upstream (ignoring): %s",
              err
            );
          }
        );
      });
    } else {
      log.info("denying socket upgrade request to unknown endpoint");
      socket.destroy();
    }
  });
}
