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
import { InstalledIntegrations } from "./Installed";
import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { createMainStore } from "state/store";
import { updateIntegrations } from "state/integration/actions";
import uniqueId from "lodash/uniqueId";
import integrationsDefs from "client/integrations";
import randomNumber from "lodash/random";
import { renderWithEnv } from "client/utils/testutils";

const getRandomIntegrationDef = () =>
  integrationsDefs[randomNumber(0, integrationsDefs.length - 1)];

const createMockIntegration = (integrationDef = getRandomIntegrationDef()) => {
  return {
    id: `integrationID-${uniqueId()}`,
    tenant_id: `tenant_id-${uniqueId()}`,
    name: `name-${uniqueId()}`,
    key: `key-${uniqueId()}`,
    kind: integrationDef.kind,
    data: {
      deployNamespace: `data.deployNamespace-${uniqueId()}`
    },
    created_at: "2021-08-06T13:03:49.979677",
    updated_at: "2021-08-06T13:03:49.979677"
  };
};

test("renders integrations", async () => {
  const store = createMainStore();
  const integrationDef = getRandomIntegrationDef();
  const integration = createMockIntegration(integrationDef);

  store.dispatch(updateIntegrations([integration]));

  renderWithEnv(<InstalledIntegrations />, { store });

  expect(
    screen.getByRole("cell", { name: integration.name })
  ).toBeInTheDocument();
  expect(
    screen.getByRole("cell", { name: integrationDef.label })
  ).toBeInTheDocument();
});

test.todo("renders integration's status");
