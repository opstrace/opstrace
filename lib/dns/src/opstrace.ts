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

import * as fs from "fs";
import { strict as assert } from "assert";

import qs from "qs";
import axios, { AxiosResponse, AxiosRequestConfig } from "axios";

import got, { Response as GotResponse } from "got";

import open from "open";

import {
  log,
  httpcl,
  debugLogHTTPResponse,
  debugLogHTTPResponseLight,
  HighLevelRetry,
  die
} from "@opstrace/utils";

const accessTokenFile = "./access.jwt";
const idTokenFile = "./id.jwt";

const DNS_SERVICE_URL = "https://dns-api.opstrace.net/dns/";
const issuer = "https://opstrace-dev.us.auth0.com";
const client_id = "fT9EPILybLT44hQl2xE7hK0eTuH1sb21";

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export class DNSClient {
  accessToken: string;
  idToken: string;
  headers: { [key: string]: string };

  private static instance: DNSClient;

  private constructor() {
    this.headers = {
      "content-type": "application/json"
    };
    this.accessToken = "";
    if (fs.existsSync(accessTokenFile)) {
      this.accessToken = fs.readFileSync(accessTokenFile, {
        encoding: "utf8",
        flag: "r"
      });
      this.headers["authorization"] = `Bearer ${this.accessToken}`;
    }
    this.idToken = "";
    if (fs.existsSync(idTokenFile)) {
      this.idToken = fs.readFileSync(idTokenFile, {
        encoding: "utf8",
        flag: "r"
      });
      this.headers["x-opstrace-id-token"] = this.idToken;
    }
  }

  public static async getInstance(): Promise<DNSClient> {
    if (!DNSClient.instance) {
      DNSClient.instance = new DNSClient();
    }

    if (DNSClient.instance.accessToken === "") {
      await DNSClient.instance.Login();
    }
    return Promise.resolve(DNSClient.instance);
  }

  public async Login(): Promise<void> {
    if (this.accessToken !== "") {
      return;
    }

    const deviceCodeRequest: AxiosRequestConfig = {
      method: "POST",
      url: `${issuer}/oauth/device/code`,
      headers: { "content-type": "application/x-www-form-urlencoded" },
      data: qs.stringify({
        client_id,
        scope: "profile email openid",
        audience: DNS_SERVICE_URL
      })
    };

    const res = await axios.request(deviceCodeRequest);

    const verification_uri = res.data["verification_uri_complete"];
    log.info(
      "Opening browser to sign in to the Opstrace DNS service in a few " +
        "seconds. If it does not open, follow this url: %s",
      verification_uri
    );
    log.info("Verification code: %s", res.data["user_code"]);

    // visualzie the countdown before trying to open the browser.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const _ in [1, 2, 3, 4, 5]) {
      await delay(1000);
      process.stderr.write(".");
    }
    process.stderr.write("\n");

    try {
      open(verification_uri);
    } catch (err) {
      log.info("failed to open browser: %s", err.message);
      log.info(
        "Please manually visit this URL in your browser: %s",
        verification_uri
      );
    }

    const tokenRequest: AxiosRequestConfig = {
      method: "POST",
      url: `${issuer}/oauth/token`,
      headers: { "content-type": "application/x-www-form-urlencoded" },
      data: qs.stringify({
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        device_code: res.data["device_code"],
        client_id
      })
    };

    // Poll for verification.
    while (true) {
      await delay(res.data["interval"] * 1000);
      let response: AxiosResponse | undefined;
      try {
        response = await axios.request(tokenRequest);
      } catch (err) {
        if (err?.response?.data) {
          const data = err?.response?.data;

          // Handle the expected case of the user not yet having confirmed
          // the login in their browse, and keep waiting / polling.
          if (data["error"] === "authorization_pending") {
            process.stderr.write(".");
            continue;
          }

          // Let's see if there is decent error detail in the response.
          const descr = data["error_description"];
          if (descr !== undefined) {
            log.warning("verification failed: %s", descr);
            // Note(JP): the legacy behavior here is to keep polling. I think
            // this is probably always known to be a permanent error, and that
            // we should leave the polling loop.
            continue;
          }

          // TODO: think about which cases to handle how. Don't retry
          // everything.
          if (err.response) {
            log.warning("unexpected response: %s", err.response);
            continue;
          }

          log.warning("unexpected error: %s", err);
          continue;
        }
      }

      assert(response);

      this.accessToken = response.data["access_token"];
      this.idToken = response.data["id_token"];
      this.headers["authorization"] = `Bearer ${this.accessToken}`;
      this.headers["x-opstrace-id-token"] = this.idToken;

      log.info("write authentication state to current working directory");
      fs.writeFileSync(accessTokenFile, this.accessToken, {
        encoding: "utf-8"
      });
      fs.writeFileSync(idTokenFile, this.idToken, { encoding: "utf-8" });

      // leave polling loop
      break;
    }
  }

  /**
   * Perform HTTP request. If response body contains data, JSON-decode and
   * return the resulting object. If the response body does not contain data
   * (length 0), return `undefined`. Perform HTTP request error handling, see
   * below.
   */
  private async requestAndHandleErrors(
    method: "GET" | "DELETE" | "POST" | "PUT",
    data?: Record<string, any>
  ): Promise<unknown | undefined> {
    const action = `DNS service client:${method}`;
    log.debug("do %s", action);

    const opts = {
      headers: this.headers,
      method: method,
      // If `data` is provided, send as JSON request body.
      json: data
    };

    // Fire off HTTP request. This is doing basic retrying.
    try {
      const resp: GotResponse<string> = await httpcl(DNS_SERVICE_URL, opts);
      debugLogHTTPResponseLight(resp);
      if (resp.body.length > 0) {
        // For a 2xx response, rely on the body to be valid JSON.
        return JSON.parse(resp.body);
      }
      return undefined;
    } catch (e) {
      if (e instanceof got.RequestError) {
        log.error("%s failed: %s: %s", action, e.code, e.message);
        debugLogHTTPResponse(e.response);

        if (e.response?.statusCode === 403) {
          die("DNS setup failed with a permanent error (403 HTTP response).");
        }

        if (e.response?.statusCode === 401) {
          // TODO: do that really, automatically: delete authentication
          // state, log in again.
          log.info("got a 401 response: need to refresh authentication state");
        }

        // It's actually unlikely that a high-level retry will heal something
        // at this point, but maybe it does. Let's see, maybe it's better UX to
        // `die()`, here, too.
        throw new HighLevelRetry(`${action} failed`);
      }
      throw e;
    }
  }

  public async getAllEntries(): Promise<unknown> {
    return await this.requestAndHandleErrors("GET");
  }

  public async Delete(clustername: string): Promise<void> {
    await this.requestAndHandleErrors("DELETE", { clustername });
  }

  public async Create(clustername: string): Promise<void> {
    await this.requestAndHandleErrors("POST", { clustername });
  }

  public async AddNameservers(
    clustername: string,
    nameservers: string[]
  ): Promise<void> {
    log.debug(
      "attempt to add name servers for cluster %s: %s",
      clustername,
      nameservers
    );
    await this.requestAndHandleErrors("PUT", {
      clustername,
      nameservers
    });
  }
}
