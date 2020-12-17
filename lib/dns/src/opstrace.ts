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
import open from "open";

import { log } from "@opstrace/utils";

const accessTokenFile = "./access.jwt";
const idTokenFile = "./id.jwt";

const issuer = "https://opstrace-dev.us.auth0.com";
const url = "https://dns-api.opstrace.net/dns/";
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
        audience: url
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

  public async GetAll(): Promise<string[]> {
    log.debug("DNSClient.GetAll()");
    const getRequest: AxiosRequestConfig = {
      method: "GET",
      url,
      headers: this.headers
    };
    const response: AxiosResponse = await axios.request(getRequest);
    return response.data;
  }

  public async Delete(clustername: string): Promise<AxiosResponse> {
    log.debug("DNSClient.Delete()");
    const deleteRequest: AxiosRequestConfig = {
      method: "DELETE",
      url,
      headers: this.headers,
      data: {
        clustername
      }
    };
    const response: AxiosResponse = await axios.request(deleteRequest);
    return response;
  }

  public async Create(clustername: string): Promise<AxiosResponse> {
    log.debug("DNSClient.Create()");
    const createRequest: AxiosRequestConfig = {
      method: "POST",
      url,
      headers: this.headers,
      data: {
        clustername
      }
    };
    const response: AxiosResponse = await axios.request(createRequest);
    return response;
    // Note(JP): expect the following error and die().
    // "code": 403,
    // "errors": [
    //   {
    //     "message": "Cloud DNS API has not been used in project 540196616614 before or it is disabled. Enable it by visiting https://console.developers.google.com/apis/api/dns.googleapis.com/overview?project=540196616614 then retry. If you enabled this API recently, wait a few minutes for the action to propagate to our systems and retry.",
    //     "domain": "usageLimits",
    //     "reason": "accessNotConfigured",
    //     "extendedHelp": "https://console.developers.google.com"
    //   }
    // ],
  }

  public async AddNameservers(
    clustername: string,
    nameservers: string[]
  ): Promise<AxiosResponse> {
    log.debug("DNSClient.AddNameservers()");
    const updateRequest: AxiosRequestConfig = {
      method: "PUT",
      url,
      headers: this.headers,
      data: {
        clustername,
        nameservers
      }
    };
    const response: AxiosResponse = await axios.request(updateRequest);
    return response;
  }
}
