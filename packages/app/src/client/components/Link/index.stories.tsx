import React from "react";
import { BrowserRouter } from "react-router-dom";

import ExternalLink from "./ExternalLink";
import Link from "./Link";

export default {
  title: "Components/Link"
};

export const Default = (): JSX.Element => {
  return (
    <div>
      <BrowserRouter>
        <Link to="/">this is a link to be used inside a Router</Link>
      </BrowserRouter>
      <br />
      <ExternalLink href="/">
        this is a link for linking to external URLs
      </ExternalLink>
    </div>
  );
};
