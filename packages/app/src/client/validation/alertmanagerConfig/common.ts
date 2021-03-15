/**
 * Copyright 2021 Opstrace, Inc.
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

import * as yup from "yup";

import { subdomainValidator } from "client/utils/regex";
import { TlsConfig, BasicAuth, HttpConfig } from "./types";

export const tlsConfigSchema: yup.SchemaOf<TlsConfig> = yup
  .object({
    ca_file: yup.string().meta({
      comment: "CA certificate to validate the server certificate with."
    }),
    cert_file: yup.string().meta({
      comment: "CA certificate to validate the server certificate with."
    }),
    key_file: yup.string().meta({
      comment:
        "Certificate and key files for client cert authentication to the server."
    }),
    server_name: yup
      .string()
      .matches(subdomainValidator, { excludeEmptyString: true })
      .meta({
        comment: "ServerName extension to indicate the name of the server.",
        url: "http://tools.ietf.org/html/rfc4366#section-3.1"
      }),
    insecure_skip_verify: yup.boolean().default(false)
  })
  .noUnknown();

export const labelNameSchema = yup.string().matches(/[a-zA-Z_][a-zA-Z0-9_]*/);

const basicAuthSchema: yup.SchemaOf<BasicAuth> = yup
  .object({
    username: yup.string(),
    password: yup.string(),
    password_file: yup.string()
  })
  .meta({
    comment:
      "Sets the `Authorization` header with the configured username and password."
  });

export const httpConfigSchema: yup.SchemaOf<HttpConfig> = yup
  .object({
    basic_auth: basicAuthSchema.notRequired(),
    bearer_token: yup.string().meta({
      comment:
        "Sets the `Authorization` header with the configured bearer token."
    }),
    bearer_token_file: yup.string().meta({
      comment:
        "Sets the `Authorization` header with the bearer token read from the configured file."
    }),
    tls_config: tlsConfigSchema.notRequired(),
    proxy_url: yup.string()
  })
  .noUnknown();
