import React from "react";

import ErrorBoundary from "client/components/Error/Boundary";
import Theme from "./themes";
import Services from "./services";
import { StoreProvider } from "state/provider";
import Routes from "./runtime/routes";

const App = () => {
  return (
    <StoreProvider>
      <Theme.ThemeSwitcher>
        <ErrorBoundary fullPage>
          <Services>
            <Routes />
          </Services>
        </ErrorBoundary>
      </Theme.ThemeSwitcher>
    </StoreProvider>
  );
};

export default App;
