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
