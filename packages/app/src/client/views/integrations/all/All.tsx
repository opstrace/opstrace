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
import { useHistory } from "react-router-dom";

import { integrationsDefs } from "client/integrations";
import {
  IntegrationDefs,
  IntegrationDef,
  addIntegrationPath
} from "client/integrations";

import { Box } from "client/components/Box";
import Grid from "@material-ui/core/Grid";
import { Card, CardContent, CardHeader } from "client/components/Card";
import Typography from "client/components/Typography/Typography";
import { Button } from "client/components/Button";
import { useSelectedTenantWithFallback } from "state/tenant/hooks/useTenant";

export const AllIntegrations = () => (
  <Box mt={3}>
    <IntegrationDefCards integrationDefs={integrationsDefs} />
  </Box>
);

type Props = { integrationDefs: IntegrationDefs };

const IntegrationDefCards = ({ integrationDefs }: Props) => {
  const history = useHistory();
  const tenant = useSelectedTenantWithFallback();

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
      {integrationDefs.map(i9n => {
        if (!i9n.enabled) {
          return null;
        }

        return (
          <Grid
            key={i9n.kind}
            item
            xs={12}
            sm={6}
            data-test={`integrations/grid/${i9n.kind}`}
          >
            <Card>
              <CardHeader
                avatar={<img src={i9n.Logo} width={50} height={50} alt="" />}
                titleTypographyProps={{ variant: "h6" }}
                title={i9n.label}
                action={
                  <Box ml={3} display="flex" flexWrap="wrap">
                    <Box p={1}>
                      <Button
                        variant="contained"
                        state="primary"
                        size="small"
                        disabled={!i9n.enabled}
                        onClick={() => onAdd(i9n)}
                      >
                        Install
                      </Button>
                    </Box>
                  </Box>
                }
              />
              <CardContent>
                <Typography color="textSecondary">{i9n.desc}</Typography>
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
};
