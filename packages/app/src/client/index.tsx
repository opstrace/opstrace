import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter } from "react-router-dom";
import * as serviceWorker from "./serviceWorker";
import { RoutesWithSSRAssetRemoval } from "./routes";

const root = document.getElementById("root");

if (process.env.NODE_ENV !== "production") {
  ReactDOM.render(
    <BrowserRouter>
      <RoutesWithSSRAssetRemoval />
    </BrowserRouter>,
    root
  );
} else {
  ReactDOM.hydrate(
    <BrowserRouter>
      <RoutesWithSSRAssetRemoval />
    </BrowserRouter>,
    root
  );
}

serviceWorker.register();
