import React from "react";
import {
  Link as ReactRouterLink,
  LinkProps as ReactRouterLinkProps
} from "react-router-dom";

import ExternalLink from "./ExternalLink";

const Link = (props: ReactRouterLinkProps) => (
  <ReactRouterLink component={ExternalLink} {...props} />
);

export default Link;
