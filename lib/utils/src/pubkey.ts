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

import crypto from "crypto";

export function keyIDfromPEM(pemstring: string): string {
  // See specification for key ID derivation in authenticator's README.
  const hash = crypto.createHash("sha1");
  // Trim leading and trailing whitespace from PEM string, take underlying
  // bytes (implicitly using utf8 here, which is correct) and build the SHA1
  // hash from it -- represent it in hex form as a string.
  hash.write(pemstring.trim());
  hash.end();
  const data = hash.read();
  const keyID = data.toString("hex");
  return keyID;
}
