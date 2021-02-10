/**
 * Copyright 2019-2021 Opstrace, Inc.
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

import fs from "fs";
import path from "path";
import express from "express";

let _html: string;

function loadHtml(): Promise<string> {
  if (_html) {
    return Promise.resolve(_html);
  }
  const indexHtml = path.join(process.cwd(), "build", "index.html");
  if (!fs.existsSync(indexHtml)) {
    throw Error(
      "You must build the client first and invoke the server from the root of the app package, e.g. cd app && node /dist/server.js"
    );
  }
  return new Promise((resolve, reject) =>
    fs.readFile(indexHtml, "utf8", (err, htmlData) => {
      if (err) {
        return reject(err);
      }
      _html = htmlData;
      resolve(htmlData);
    })
  );
}

/**
 * Renders just the plain html that was compiled for our client
 * @param req
 * @param res
 */
async function renderAppShell(req: express.Request, res: express.Response) {
  if (process.env.NODE_ENV === "production") {
    const htmlData = await loadHtml();
    res.send(htmlData);
  } else {
    res.status(404).send("not found");
  }
}

export default renderAppShell;
