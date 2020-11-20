import React from "react";

import { Page } from "client/components/Page";

const FullPage = (props: { children: React.ReactNode }) => {
  return (
    <Page p={0} justifyContent="left" alignItems="normal">
      {props.children}
    </Page>
  );
};

export default FullPage;
