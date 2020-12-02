/**
 * Copyright 2020 Opstrace, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
