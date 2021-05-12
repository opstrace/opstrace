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
// import { filter, propEq } from "ramda";
import { useHistory } from "react-router-dom";

import { integrationsDefs } from "client/viewsBasic/integrationDefs";
import { IntegrationDefs } from "client/viewsBasic/integrationDefs/types";
import { addIntegrationPath } from "client/viewsBasic/tenantIntegrations/paths";

import { withTenantFromParams, TenantProps } from "client/views/tenant/utils";
import { withSkeleton } from "client/viewsBasic/common/utils";

import { Box } from "client/components/Box";
import Grid from "@material-ui/core/Grid";
import { Card, CardContent, CardHeader } from "client/components/Card";
import Typography from "client/components/Typography/Typography";
import { Button } from "client/components/Button";

export const AllIntegrations = () => (
  <Box mt={3}>
    <IntegrationDefCards integrationDefs={integrationsDefs} />
  </Box>
);

type Props = { integrationDefs: IntegrationDefs };

const IntegrationDefCards = withTenantFromParams<Props>(
  withSkeleton<Props>(({ integrationDefs, tenant }: Props & TenantProps) => {
    const history = useHistory();
    // const available = filter(propEq("enabled", true))(data);

    // @ts-ignore
    const onAdd = (i9n: IntegrationDef) => {
      history.push(
        addIntegrationPath({
          tenant: tenant,
          integrationDef: i9n
        })
      );
    };

    return (
      <Grid container spacing={3}>
        {integrationDefs.map(i9n => (
          <Grid key={i9n.kind} item xs={12} sm={6} md={4} lg={3}>
            <Card>
              <CardHeader
                titleTypographyProps={{ variant: "h6" }}
                title={i9n.label}
                action={
                  <Box ml={3} display="flex" flexWrap="wrap">
                    <Box p={1}>
                      <Button
                        variant="contained"
                        size="small"
                        disabled={!i9n.enabled}
                        onClick={() => onAdd(i9n)}
                      >
                        Add
                      </Button>
                    </Box>
                  </Box>
                }
              />
              <CardContent>
                <Typography color="textSecondary">{i9n.desc}</Typography>
                {i9n.enabled ? null : <i>Coming soon</i>}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  })
);
