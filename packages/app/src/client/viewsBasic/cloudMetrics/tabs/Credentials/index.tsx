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
import { map } from "ramda";

import useHasura from "client/hooks/useHasura";
import { withTenantFromParams, TenantProps } from "client/views/tenant/utils";

import { CredentialsTable } from "./Table";
import { CredentialsForm } from "./Form";

import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles(theme => ({
  gridContainer: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "16px 0px",
    gridTemplateAreas: `"." "."`
  }
}));

const Credentials = withTenantFromParams(({ tenant }: TenantProps) => {
  const classes = useStyles();

  const { data, mutate: changeCallback } = useHasura(
    `
      query credentials($tenant_id: String!) {
        credential(where: {tenant: {_eq: $tenant_id}}) {
          name
          type
          created_at
          exporters_aggregate {
            aggregate {
              count
            }
          }
        }
      }
     `,
    { tenant_id: tenant.name }
  );

  return (
    <div className={classes.gridContainer}>
      <CredentialsTable
        tenantId={tenant.name}
        onChange={changeCallback}
        rows={formatRows(data?.credential)}
      />
      <CredentialsForm tenantId={tenant.name} onCreate={changeCallback} />
    </div>
  );
});

const formatRows = (data: any[] | undefined) => {
  if (data)
    return map((d: any) => ({
      name: d.name,
      type: d.type,
      exporter_count: d.exporters_aggregate.aggregate.count,
      created_at: d.created_at
    }))(data);
  else return [];
};

const CredentialsTab = {
  key: "credentials",
  label: "Credentials",
  content: Credentials
};

export { Credentials, CredentialsTab };
