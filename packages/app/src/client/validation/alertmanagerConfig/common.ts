import * as yup from "yup";

import { subdomainValidator } from "client/utils/regex";

export const tlsConfig = yup
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
  .nullable()
  .default(null);

export const labelName = yup.string().matches(/[a-zA-Z_][a-zA-Z0-9_]*/);

export const httpConfig = yup
  .object({
    basic_auth: yup
      .object({
        username: yup.string(),
        password: yup.string(),
        password_file: yup.string()
      })
      .meta({
        comment:
          "Sets the `Authorization` header with the configured username and password."
      }),
    bearer_token: yup.string().meta({
      comment:
        "Sets the `Authorization` header with the configured bearer token."
    }),
    bearer_token_file: yup.string().meta({
      comment:
        "Sets the `Authorization` header with the bearer token read from the configured file."
    }),
    tls_config: tlsConfig,
    proxy_url: yup.string()
  })
  .nullable()
  .default(null);
