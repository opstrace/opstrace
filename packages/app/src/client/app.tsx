import React from "react";

import ErrorBoundary from "./components/Error/Boundary";
import Theme from "./themes";
import Services from "./services";
import { StoreProvider } from "state/provider";
import Routes from "./views/routes";

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
