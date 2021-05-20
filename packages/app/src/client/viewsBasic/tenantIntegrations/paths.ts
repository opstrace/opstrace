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

import { Integration } from "state/integrations/types";
import { IntegrationDef } from "client/viewsBasic/integrationDefs/types";
import { Tenant } from "state/tenant/types";

const baseIntegrationsPath = (tenant: Tenant) =>
  `/tenant/${tenant.name}/integrations`;

export const allIntegrationsPath = ({ tenant }: { tenant: Tenant }) =>
  `${baseIntegrationsPath(tenant)}/all`;

export const installedIntegrationsPath = ({ tenant }: { tenant: Tenant }) =>
  `${baseIntegrationsPath(tenant)}/installed`;

export const addIntegrationPath = ({
  tenant,
  integrationDef
}: {
  tenant: Tenant;
  integrationDef: IntegrationDef;
}) => `${baseIntegrationsPath(tenant)}/all/add/${integrationDef.kind}`;

export const showIntegrationPath = ({
  tenant,
  integration
}: {
  tenant: Tenant;
  integration: Integration;
}) => `${baseIntegrationsPath(tenant)}/installed/${integration.id}`;

export const editIntegrationPath = ({
  tenant,
  integration
}: {
  tenant: Tenant;
  integration: Integration;
}) => `${baseIntegrationsPath(tenant)}/installed/${integration.id}/edit`;
