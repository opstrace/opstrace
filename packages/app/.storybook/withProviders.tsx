import React from "react";
import { createMemoryHistory } from "history";
import { Router } from "react-router-dom";
import { ITheme } from "../src/client/themes/types";
import ThemeProvider from "../src/client/themes/Provider";
import { StoreProvider } from "../src/state/provider";

interface Props {
  theme: ITheme;
}

interface Props {
  children?: React.ReactNode;
  theme: ITheme;
}

class WithProviders extends React.Component<Props> {
  render() {
    const { theme, children } = this.props;

    return (
      <Router history={createMemoryHistory()}>
        <StoreProvider>
          <ThemeProvider theme={theme}>{children}</ThemeProvider>
        </StoreProvider>
      </Router>
    );
  }
}

export default WithProviders;
