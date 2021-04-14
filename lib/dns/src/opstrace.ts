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

import got, {
  Response as GotResponse,
  OptionsOfTextResponseBody as GotOptions
} from "got";

import open from "open";

import {
  log,
  httpcl,
  debugLogHTTPResponse,
  debugLogHTTPResponseLight,
  HighLevelRetry,
  die,
  sleep,
  Dict
} from "@opstrace/utils";

const ACCESS_TOKEN_FILE_PATH = "./access.jwt";
const ID_TOKEN_FILE_PATH = "./id.jwt";

// Use e.g. https://httpbin.org/status/500
// for testing behavior upon 5xx.
const DNS_SERVICE_URL = "https://dns-api.opstrace.net/dns/";

const OIDC_ISSUER = "https://opstrace-dev.us.auth0.com";
const OIDC_CLIENT_ID = "fT9EPILybLT44hQl2xE7hK0eTuH1sb21";

/**
 *
 * @param dcode device code
 *
 * @returns `undefined`, signalling to the caller to keep looping
 * @returns data object of type `Dict<string>` upon success.
 */
async function loginPollRequest(
  dcode: string
): Promise<Dict<string> | undefined> {
  const opts: GotOptions = {
    method: "POST",
    form: {
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      device_code: dcode,
      client_id: OIDC_CLIENT_ID
    },
    // Some HTTP error responses are expected. Do this handling work manually.
    throwHttpErrors: false
  };

  const url = `${OIDC_ISSUER}/oauth/token`;

  const resp: GotResponse<string> | undefined = await httpcl(url, opts);

  if (resp === undefined) {
    log.warning("loginPollRequest() did not yield an HTTP response");

    // This is for the rare case where HTTP client-internal retrying didn't
    // result in an HTTP response. Signal to the caller that the expected
    // outcome isn't there yet.
    return undefined;
  }

  debugLogHTTPResponseLight(resp);

  let data: any;
  try {
    data = JSON.parse(resp.body);
  } catch (err) {
    log.warning(
      "could not parse response body as JSON: %s: %s",
      err.code,
      err.message
    );

    return undefined;
  }

  if (data["id_token"] !== undefined) {
    log.debug("OIDC ID Token in response");
    return data;
  }

  // Handle the expected case of the user not yet having confirmed the login in
  // their browser, and signal to caller to keep waiting / polling.
  if (data["error"] === "authorization_pending") {
    return undefined;
  }

  // Let's see if there is decent error detail in the response.
  const descr = data["error_description"];
  if (descr !== undefined) {
    log.error("verification failed: %s", descr);
    // Note(JP): the legacy behavior here was to keep polling. That does not
    // seem to be the right approach. This should be looked at as a permanent
    // DNS service login error. Leave the program.
    die("DNS service login failed");
  }

  // TODO: think about which cases to handle how. Don't retry everything.
  debugLogHTTPResponse(resp);
  log.warning("unexpected HTTP response, but keep polling");
  return undefined;
}

interface DeviceCodeLoginResult {
  idToken: string;
  accessToken: string;
}

/**
 * Initiate what Auth0 calls a device authorization flow:
 * https://auth0.com/docs/flows/device-authorization-flow
 */
async function deviceCodeLogin(): Promise<DeviceCodeLoginResult> {
  log.info(`initiate device code login against ${OIDC_ISSUER}`);

  const resp: GotResponse<string> = await httpcl(
    `${OIDC_ISSUER}/oauth/device/code`,
    {
      method: "POST",
      form: {
        client_id: OIDC_CLIENT_ID,
        scope: "profile email openid",
        audience: DNS_SERVICE_URL
      }
    }
  );

  const data = JSON.parse(resp.body);

  if (data.verification_uri_complete === undefined) {
    log.error("unexpected data in HTTP response: %s", data);
    die("DNS service login failed");
  }

  assert(data["user_code"]);
  assert(data["device_code"]);
  assert(data["interval"]);

  const verification_uri = data["verification_uri_complete"];
  log.info(
    "Opening browser to sign in to the Opstrace DNS service in a few " +
      "seconds. If it does not open, follow this URL: %s",
    data["verification_uri_complete"]
  );
  log.info("Verification code: %s", data["user_code"]);

  // Visualize the countdown before trying to open the browser.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const _ in [1, 2, 3, 4, 5]) {
    await sleep(1);
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

  // Poll for verification result.

  let result: Dict<string> | undefined;

  while (true) {
    await sleep(data["interval"]);

    result = await loginPollRequest(data["device_code"]);

    if (result !== undefined) {
      break;
    }

    // Visualize to the user that polling is still ongoing.
    process.stderr.write(".");
  }

  // The next log message should appear on its own new line.
  process.stderr.write("\n");

  // Note(JP): only one of both is needed to present as authentication proof
  // to the Opstrace DNS service. Consolidate that. Probably the ID Token.
  assert(result["access_token"]);
  assert(result["id_token"]);

  return {
    idToken: result["id_token"],
    accessToken: result["access_token"]
  };
}

export class DNSClient {
  accessToken: string;
  idToken: string;
  additionalHeaders: { [key: string]: string };

  private static instance: DNSClient;

  private constructor() {
    this.additionalHeaders = {};
    this.accessToken = "";
    this.idToken = "";

    if (fs.existsSync(ACCESS_TOKEN_FILE_PATH)) {
      log.debug(
        "DNS service client: read access token from %s",
        ACCESS_TOKEN_FILE_PATH
      );

      this.accessToken = fs.readFileSync(ACCESS_TOKEN_FILE_PATH, {
        encoding: "utf8",
        flag: "r"
      });
      this.additionalHeaders["authorization"] = `Bearer ${this.accessToken}`;
    }

    if (fs.existsSync(ID_TOKEN_FILE_PATH)) {
      log.debug(
        "DNS service client: read ID token from %s",
        ID_TOKEN_FILE_PATH
      );

      this.idToken = fs.readFileSync(ID_TOKEN_FILE_PATH, {
        encoding: "utf8",
        flag: "r"
      });
      this.additionalHeaders["x-opstrace-id-token"] = this.idToken;
    }
  }

  private clearAuthnState() {
    this.accessToken = "";
    this.idToken = "";
  }

  public static async getInstance(): Promise<DNSClient> {
    if (!DNSClient.instance) {
      DNSClient.instance = new DNSClient();
    }

    if (DNSClient.instance.accessToken === "") {
      await DNSClient.instance.login();
    }

    return Promise.resolve(DNSClient.instance);
  }

  public async login(): Promise<void> {
    if (this.accessToken !== "") {
      log.debug("skip login: accessToken already set");
      return;
    }

    const { accessToken, idToken } = await deviceCodeLogin();

    this.accessToken = accessToken;
    this.idToken = idToken;
    this.additionalHeaders["authorization"] = `Bearer ${accessToken}`;
    this.additionalHeaders["x-opstrace-id-token"] = this.idToken;

    log.info(
      "login successful, write authentication state to current working directory"
    );
    fs.writeFileSync(ACCESS_TOKEN_FILE_PATH, this.accessToken, {
      encoding: "utf-8"
    });
    fs.writeFileSync(ID_TOKEN_FILE_PATH, this.idToken, { encoding: "utf-8" });
  }

  /**
   * Perform HTTP request. If response is good (expected):
   *
   *  - if it is a 2xx response containing a response body: JSON-decode and
   *    return the resulting object.
   *  - if the response body does not contain data (length 0), return
   *    `undefined`. This may also happen for expected 404 responses (e.g.
   *    DELETE an unknown cluster entry (is already deleted))
   *
   * Perform HTTP request error handling, see below.
   */
  private async requestAndHandleErrors(
    method: "GET" | "DELETE" | "POST" | "PUT",
    data?: Record<string, unknown>
  ): Promise<unknown | undefined> {
    const action = `DNS service client:${method}`;
    log.debug("do %s", action);

    const gotopts: GotOptions = {
      headers: this.additionalHeaders,
      method: method,
      json: data
    };

    while (true) {
      try {
        // Note: httpcl() is doing basic retrying for transient issues.
        const resp: GotResponse<string> = await httpcl(
          DNS_SERVICE_URL,
          gotopts
        );

        debugLogHTTPResponseLight(resp);

        if (resp.body.length > 0) {
          // For a 2xx response, rely on the body to be valid JSON.
          return JSON.parse(resp.body);
        }

        // Good response, no data in response.
        return undefined;
      } catch (e) {
        if (e instanceof got.RequestError) {
          debugLogHTTPResponse(e.response);

          // In the future, a DELETE may result in a 404 when the cluster isn't
          // configured (already deleted) for the user that makes this request.
          if (e.response?.statusCode === 404 && method === "DELETE") {
            if (e.response?.body !== undefined) {
              const bodytext = e.response?.body as string;
              if (bodytext.includes("ERR_ENTITY_NOT_FOUND_FOR_USER")) {
                log.info("%s: cluster already deleted for user");

                // Good response, caller not interested in response body.
                return undefined;
              }
            }
          }

          // Emit as warning, not yet sure if that's fatal.
          // `e.code` may be `undefined`. `e.message` may be
          // "Response code 401 (Unauthorized)".
          log.warning("%s failed: %s", action, e.message);

          if (e.response?.statusCode === 403) {
            die("DNS setup failed with a permanent error (403 HTTP response).");
          }

          // exit if we're trying to use a cluster name that is already taken
          if (e.response?.statusCode === 409 && method === "POST") {
            die("DNS setup failed with a permanent error, please choose a different cluster name");
          }

          if (e.response?.statusCode === 401) {
            log.info("perform another login to refresh authentication state");
            this.clearAuthnState();
            await this.login();

            log.info(
              "retry the request that previously failed with a 401 response"
            );
            continue;
          }

          // It's actually unlikely that a high-level retry will heal something
          // at this point, but maybe it does. Let's see, maybe it's better UX to
          // `die()`, here, too.
          throw new HighLevelRetry(`${action} failed`);
        }

        // Re-throw all other errors, such as JSON.parse() errors.
        throw e;
      }
    }
  }

  public async getAllEntries(): Promise<unknown> {
    return await this.requestAndHandleErrors("GET");
  }

  public async delete(clustername: string): Promise<void> {
    await this.requestAndHandleErrors("DELETE", { clustername });
  }

  public async create(clustername: string): Promise<void> {
    await this.requestAndHandleErrors("POST", { clustername });
  }

  public async addNameservers(
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
