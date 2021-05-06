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

import useHasura from "client/hooks/useHasura";
import { withTenantFromParams, TenantProps } from "client/views/tenant/utils";

import { InstalledIntegrationsTable } from "./Table";

import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles(theme => ({
  gridContainer: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "16px 0px",
    gridTemplateAreas: `"." "."`
  }
}));

const InstalledIntegrations = withTenantFromParams(
  ({ tenant }: TenantProps) => {
    const classes = useStyles();

    const { data } = useHasura(
      `
      query integrations($tenant_id: uuid = "") {
        integrations(where: {tenant_id: {_eq: $tenant_id}}) {
          id
          name
          kind
          status
          created_at
          updated_at
        }
      }
     `,
      { tenant_id: tenant.id }
    );

    return (
      <div className={classes.gridContainer}>
        <InstalledIntegrationsTable rows={data?.integrations || []} />
      </div>
    );
  }
);

const InstalledIntegrationsTab = {
  key: "installed",
  label: "Installed Integrations",
  content: InstalledIntegrations
};

export { InstalledIntegrations, InstalledIntegrationsTab };
