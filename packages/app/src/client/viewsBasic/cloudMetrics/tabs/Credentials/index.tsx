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

import React, { useCallback } from "react";
import { useParams } from "react-router-dom";

import useFetcher from "client/hooks/useFetcher";

import { CredentialsTable } from "./Table";
import { CredentialsForm } from "./Form";

import { Box } from "client/components/Box";
import Grid from "@material-ui/core/Grid";

function Credentials() {
  const { tenantId } = useParams<{ tenantId: string }>();

  const { data, mutate } = useFetcher(
    `query credentials($tenant_id: String) {
       credential(where: { tenant: { _eq: $tenant_id } }) {
         name
         type
         created_at
       }
     }`,
    { tenant_id: tenantId }
  );

  const reload = useCallback(() => mutate(), [mutate]);

  return (
    <Box display="flex" height="500px" width="700px">
      <Grid
        container
        alignItems="flex-start"
        justify="flex-start"
        direction="column"
      >
        <Grid item>
          <CredentialsTable rows={data?.credential} />
        </Grid>
        <Grid item>
          <CredentialsForm tenantId={tenantId} onCreate={reload} />
        </Grid>
      </Grid>
    </Box>
  );
}

const CredentialsTab = {
  key: "credentials",
  label: "Credentials",
  content: Credentials
};

export { Credentials, CredentialsTab };
