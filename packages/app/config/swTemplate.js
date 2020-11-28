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

/*eslint-disable */
import { createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { setCacheNameDetails, clientsClaim, skipWaiting } from "workbox-core";

// cache our /app-shell for client to fall back on after first render
self.__precacheManifest = [{ url: "/app-shell", revision: null }].concat(
  self.__WB_MANIFEST || []
);

setCacheNameDetails({
  prefix: "opstrace-app",
  suffix: "v1",
  precache: "install-time",
  runtime: "run-time"
});

// https://developers.google.com/web/tools/workbox/modules/workbox-core#skip_waiting_and_clients_claim
clientsClaim();
skipWaiting();

// precache and route asserts built by webpack
precacheAndRoute(self.__precacheManifest);

// return app shell for all navigation requests
// This assumes /app-shell has been precached.
const handler = createHandlerBoundToURL("/app-shell", {
  cacheName: "opstrace-app-install-time-v1",
  // make sure we don't cache routes to our api
  blacklist: [new RegExp("/_/"), new RegExp("/modules/.*/latest/")]
});
const navigationRoute = new NavigationRoute(handler);
registerRoute(navigationRoute);

/*eslint-enable */
