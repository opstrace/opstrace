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
import Grid from "@material-ui/core/Grid";

import { Box } from "client/components/Box";
import Typography from "client/components/Typography/Typography";
import { useTheme } from "@material-ui/core/styles";

const ClusterOverview = () => {
  const theme = useTheme();

  return (
    <>
      <Box pt={1} pb={4}>
        <Typography variant="h1">Cluster Health</Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Box
            border={`1px solid ${theme.palette.divider}`}
            borderRadius={theme.shape.borderRadius}
            overflow="hidden"
          >
            <iframe
              width="100%"
              height={1550}
              style={{ border: "none" }}
              title="Cluster Health"
              src={`${window.location.protocol}//system.${window.location.host}/grafana/d/3e97d1d02672cdd0861f4c97c64f89b2/use-method-cluster?orgId=1&refresh=10s&kiosk`}
            />
          </Box>
        </Grid>
      </Grid>
    </>
  );
};

export default ClusterOverview;
