import React from "react";
import MuiLink, { LinkProps } from "@material-ui/core/Link";

const ExternalLink = (props: LinkProps) => (
  <MuiLink underline="none" {...props} />
);

export default ExternalLink;
