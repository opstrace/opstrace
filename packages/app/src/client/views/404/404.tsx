import React from "react";
import styled from "styled-components";

import NotFoundComponent, {
  NotFoundProps
} from "client/components/Error/NotFound";
import { Page } from "client/components/Page";

// Force this component to cover over any existing UI elements
// by setting position to absolute and background to something opaque
const StyledPage = styled(Page)`
  background: ${props => props.theme.palette.background.default};
`;

const NotFound = (props: NotFoundProps) => {
  return (
    <StyledPage position="absolute">
      <NotFoundComponent {...props} />
    </StyledPage>
  );
};

export default NotFound;
