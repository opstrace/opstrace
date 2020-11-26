import React from "react";
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
      <StoreProvider>
        <ThemeProvider theme={theme}>{children}</ThemeProvider>
      </StoreProvider>
    );
  }
}

export default WithProviders;
