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

import {
  withIntegrationFromParams,
  IntegrationProps
} from "client/viewsBasic/integrations/utils";
import { integrationRecords } from "client/viewsBasic/integrations";

import NotFound from "client/views/404/404";

export const ShowIntegration = withIntegrationFromParams(
  ({ integration }: IntegrationProps) => {
    const integrationDef = integrationRecords[integration.kind];

    console.log(integrationRecords, integration, integration.kind);

    if (!integrationDef) return <NotFound />;

    return (
      <integrationDef.Show
        integration={integration}
        integrationDef={integrationDef}
      />
    );
  }
);
