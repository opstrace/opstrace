/**
 * Copyright 2021 Opstrace, Inc.
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
import { AllIntegrations } from "./All";
import Services from "client/services";
import light from "client/themes/light";
import ThemeProvider from "client/themes/Provider";
import "@testing-library/jest-dom";
import { render, screen, within } from "@testing-library/react";
import { createMemoryHistory } from "history";
import { Router } from "react-router-dom";
import { StoreProvider } from "state/provider";
import integrationsDefs from "client/integrations";
import { userEvent } from "client/utils/testutils";

test("renders integrations", async () => {
  renderComponent(<AllIntegrations />);
  integrationsDefs
    .filter(i9n => i9n.enabled)
    .forEach(i9n => {
      expect(screen.getByText(i9n.label)).toBeInTheDocument();
    });
});

test("does not render disabled integrations", async () => {
  renderComponent(<AllIntegrations />);
  integrationsDefs
    .filter(i9n => !i9n.enabled)
    .forEach(i9n => {
      expect(screen.queryByText(i9n.label)).not.toBeInTheDocument();
    });
});

test("clicking install redirects correctly", async () => {
  const history = createMemoryHistory();
  const integration = integrationsDefs[0].kind;
  renderComponent(<AllIntegrations />, { history });
  const integrationCard = within(screen.getByTestId(`${integration}-card`));
  userEvent.click(integrationCard.getByRole("button", { name: "Install" }));
  expect(history.location.pathname).toBe(
    `/tenant/system/integrations/all/install/${integration}`
  );
});

const renderComponent = (
  children: React.ReactNode,
  { history = createMemoryHistory() } = {}
) => {
  return render(
    <StoreProvider>
      <ThemeProvider theme={light}>
        <Services>
          <Router history={history}>{children}</Router>
        </Services>
      </ThemeProvider>
    </StoreProvider>
  );
};
