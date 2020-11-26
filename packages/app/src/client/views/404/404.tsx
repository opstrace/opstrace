import React from "react";

import NotFoundComponent, {
  NotFoundProps
} from "client/components/Error/NotFound";
import { Page } from "client/components/Page";

const NotFound = (props: NotFoundProps) => {
  return (
    <Page>
      <NotFoundComponent {...props} />
    </Page>
  );
};

export default NotFound;
