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
import { Link } from "react-router-dom";

import { integrationsDefs } from "client/integrations";
import { IntegrationDef, addIntegrationPath } from "client/integrations";

import { Box } from "client/components/Box";
import Grid from "@material-ui/core/Grid";
import { Card, CardContent, CardHeader } from "client/components/Card";
import Typography from "client/components/Typography/Typography";
import { Button } from "client/components/Button";
import { useSelectedTenantWithFallback } from "state/tenant/hooks/useTenant";

const Integration = (props: { integrationDef: IntegrationDef }) => {
  const tenant = useSelectedTenantWithFallback();

  return (
    <Grid
      key={props.integrationDef.kind}
      item
      xs={12}
      sm={6}
      data-test={`integrations/grid/${props.integrationDef.kind}`}
    >
      <Card data-testid={`${props.integrationDef.kind}-card`}>
        <CardHeader
          avatar={
            <img
              src={props.integrationDef.Logo}
              width={50}
              height={50}
              alt=""
            />
          }
          titleTypographyProps={{ variant: "h6" }}
          title={props.integrationDef.label}
          action={
            <Box ml={3} display="flex" flexWrap="wrap">
              <Box p={1}>
                <Link
                  style={{ textDecoration: "none" }}
                  to={addIntegrationPath({
                    tenant: tenant,
                    integrationDef: props.integrationDef
                  })}
                >
                  <Button variant="contained" state="primary" size="small">
                    Install
                  </Button>
                </Link>
              </Box>
            </Box>
          }
        />
        <CardContent>
          <Typography color="textSecondary">
            {props.integrationDef.desc}
          </Typography>
        </CardContent>
      </Card>
    </Grid>
  );
};

export const AllIntegrations = () => {
  return (
    <Box mt={3}>
      <Grid container spacing={3}>
        {integrationsDefs
          .filter(i9n => i9n.enabled)
          .map(i9n => (
            <Integration key={i9n.kind} integrationDef={i9n} />
          ))}
      </Grid>
    </Box>
  );
};
