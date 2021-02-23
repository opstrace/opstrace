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

import React, { useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import Skeleton from "@material-ui/lab/Skeleton";
//import { useDispatch } from "react-redux";

import { Box } from "client/components/Box";

import Layout from "client/layout/MainContent";
import SideBar from "./Sidebar";
import { YamlEditor } from "client/components/Editor";
import { yaml } from "workers";

import { Card, CardContent, CardHeader } from "client/components/Card";
//import { Button } from "client/components/Button";
import useTenantList from "state/tenant/hooks/useTenantList";

const TenantDetail = () => {
  const params = useParams<{ tenant: string }>();
  const tenants = useTenantList();
  const model = monaco.editor.createModel(
    `
  hello
  `,
    "yaml"
  );

  //const dispatch = useDispatch();
  useEffect(() => {
    yaml &&
      yaml.yamlDefaults.setDiagnosticsOptions({
        validate: true,
        enableSchemaRequest: true,
        hover: true,
        completion: true,
        schemas: []
      });
  }, []);

  const selectedTenant = useMemo(
    () => tenants.find(t => t.name === params.tenant),
    [params.tenant, tenants]
  );

  if (!selectedTenant)
    return (
      <Layout sidebar={SideBar}>
        <Skeleton variant="rect" width="100%" height="100%" animation="wave" />
      </Layout>
    );
  else
    return (
      <Layout sidebar={SideBar}>
        <Box
          width="100%"
          height="100%"
          display="flex"
          justifyContent="center"
          alignItems="center"
          flexWrap="wrap"
          p={1}
        >
          <Box maxWidth={700}>
            <Card p={3}>
              <CardHeader
                titleTypographyProps={{ variant: "h5" }}
                title={`${selectedTenant.name} / Alerts Manager Configuration`}
              />
              <CardContent>
                <Box display="flex">
                  <YamlEditor model={model} />
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Layout>
    );
};

export default TenantDetail;
