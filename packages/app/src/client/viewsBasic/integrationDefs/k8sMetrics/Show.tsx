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

import React, { useMemo } from "react";
import { useHistory } from "react-router-dom";
import { saveAs } from "file-saver";
import axios from "axios";

import { IntegrationProps } from "client/viewsBasic/tenantIntegrations/utils";
import { IntegrationDefProps } from "client/viewsBasic/integrationDefs/utils";

import { withTenantFromParams, TenantProps } from "client/views/tenant/utils";

import { prometheusYaml } from "./templates/config";
import * as commands from "./templates/commands";
import {
  makePrometheusFolderRequest,
  makePrometheusDashboardRequests
} from "./templates/dashboards";

import { CheckStatusBtn } from "./CheckStatusBtn";
import { CopyToClipboardIcon } from "client/viewsBasic/common/CopyToClipboard";

import useHasuraSubscription from "client/hooks/useHasuraSubscription";

import { Box } from "client/components/Box";
import Attribute from "client/components/Attribute";
import { Card, CardContent, CardHeader } from "client/components/Card";
import { Button } from "client/components/Button";

import { makeStyles, Theme, createStyles } from "@material-ui/core/styles";
import Modal from "@material-ui/core/Modal";

type folderInfo = {
  // The numeric ID for the folder that was created (or updated).
  // This ID must be included when creating dashboards within the folder.
  id: number;
  // The '/grafana/...' path linking to the folder in Grafana.
  // Doesn't include the hostname.
  urlPath: String;
};

async function createFolder(
  tenantName: String,
  folder: object
): Promise<folderInfo> {
  // see also: https://grafana.com/docs/grafana/latest/http_api/folder/#create-folder
  const responseData = await axios({
    method: "post",
    url: `${window.location.protocol}//${tenantName}.${window.location.host}/grafana/api/folders`,
    data: folder,
    withCredentials: true
  }).then(res => res.data);
  return {
    id: responseData.id,
    urlPath: responseData.url
  };
}

type dashboardInfo = {
  // The '/grafana/...' path linking to the dashboard in Grafana.
  // Doesn't include the hostname.
  urlPath: String;
};

async function createDashboard(
  tenantName: String,
  dashboard: object
): Promise<dashboardInfo> {
  // see also: https://grafana.com/docs/grafana/latest/http_api/dashboard/#create--update-dashboard
  const responseData = await axios({
    method: "post",
    url: `${window.location.protocol}//${tenantName}.${window.location.host}/grafana/api/dashboards/db`,
    data: dashboard,
    withCredentials: true
  }).then(res => res.data);
  return {
    urlPath: responseData.url
  };
}

const configFilename = "opstrace-k8s-metrics.yaml";

const INTEGRATION_STATUS_SUBSCRIPTION = `
  subscription IntegrationStatus($id: uuid!) {
    integrations_by_pk(id: $id) {
      status
      updated_at
    }
  }
`;

export const K8sMetricsShow = withTenantFromParams(
  ({
    integration,
    integrationDef,
    tenant
  }: IntegrationProps & IntegrationDefProps & TenantProps) => {
    const history = useHistory();

    const { data: statusData } = useHasuraSubscription(
      INTEGRATION_STATUS_SUBSCRIPTION,
      {
        id: integration.id
      }
    );

    const status = useMemo(() => {
      return statusData?.integrations_by_pk?.status || integration.status;
    }, [statusData?.integrations_by_pk?.status, integration.status]);

    const config = useMemo(() => {
      return prometheusYaml({
        clusterHost: window.location.host,
        tenantName: tenant.name,
        integrationId: integration.id,
        deployNamespace: integration.data.deployNamespace
      });
    }, [tenant.name, integration.id, integration.data.deployNamespace]);

    const deployYamlCommand = useMemo(
      () => commands.deployYaml(configFilename, tenant.name),
      [tenant.name]
    );

    const downloadHandler = () => {
      var configBlob = new Blob([config], {
        type: "application/x-yaml;charset=utf-8"
      });
      saveAs(configBlob, configFilename);
    };

    const dashboardHandler = async () => {
      const folder = await createFolder(
        tenant.name,
        makePrometheusFolderRequest({
          integrationId: integration.id,
          integrationName: integration.name
        })
      );
      console.log(`Folder created: id=${folder.id} path=${folder.urlPath}`);

      for (const d of makePrometheusDashboardRequests({
        integrationId: integration.id,
        folderId: folder.id
      })) {
        const result = await createDashboard(tenant.name, d);
        console.log(`Dashboard created: path=${result.urlPath}`);
      }
    };

    return (
      <>
        <Box
          width="100%"
          height="100%"
          display="flex"
          justifyContent="center"
          alignItems="center"
          flexWrap="wrap"
          p={1}
        >
          <Card>
            <CardHeader
              titleTypographyProps={{ variant: "h5" }}
              title={integration.name}
              action={
                <Box ml={3} display="flex" flexWrap="wrap">
                  <Box p={1}>
                    <Button
                      size="small"
                      onClick={() =>
                        history.push(
                          `/tenant/${tenant.name}/integrations/installed`
                        )
                      }
                    >
                      {"< Back"}
                    </Button>
                  </Box>
                </Box>
              }
            />
            <CardContent>
              <Box display="flex">
                <Box display="flex" flexDirection="column">
                  <Attribute.Key>Integration:</Attribute.Key>
                  <Attribute.Key>Category:</Attribute.Key>
                  <Attribute.Key>Status:</Attribute.Key>
                  <Attribute.Key>Created:</Attribute.Key>
                </Box>
                <Box display="flex" flexDirection="column" flexGrow={1}>
                  <Attribute.Value>{integrationDef.label}</Attribute.Value>
                  <Attribute.Value>{integrationDef.category}</Attribute.Value>
                  <Attribute.Value>
                    {status}{" "}
                    <CheckStatusBtn integration={integration} tenant={tenant} />
                  </Attribute.Value>
                  <Attribute.Value>{integration.created_at}</Attribute.Value>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
        <Box
          width="100%"
          height="100%"
          display="flex"
          justifyContent="center"
          alignItems="center"
          flexWrap="wrap"
          p={1}
        >
          <Card>
            <CardHeader
              titleTypographyProps={{ variant: "h5" }}
              title="Install Instructions"
            />
            <CardContent>
              <Box display="flex">
                <Box display="flex" flexDirection="column" flexGrow={1}>
                  <Attribute.Value>
                    {`Step 1. Download the generated config YAML and save to the same
                    location as the api key for Tenant "${tenant.name}", it should be called "tenant-api-token-${tenant.name}".`}
                    <br />
                    <br />
                    <Button
                      variant="contained"
                      size="small"
                      onClick={downloadHandler}
                    >
                      Download YAML
                    </Button>
                    <ViewConfigButtonModal
                      filename={configFilename}
                      config={config}
                    />
                  </Attribute.Value>
                  <Attribute.Value>
                    {`Step 2. Run this command to install Prometheus`}
                    <br />
                    <pre>{deployYamlCommand}</pre>
                    <CopyToClipboardIcon text={deployYamlCommand} />
                  </Attribute.Value>
                  <Attribute.Value>
                    Step 3. Once the integration is installed in your namepsace
                    we can install our default set of Grafana Dashboards for
                    you.
                    <br />
                    <br />
                    <Button
                      variant="contained"
                      size="small"
                      disabled={integration.grafana_folder_id !== null}
                      onClick={dashboardHandler}
                    >
                      Install Dashboards
                    </Button>
                  </Attribute.Value>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </>
    );
  }
);

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    modal: {
      display: "flex",
      justifyItems: "center",
      alignItems: "center",
      justifyContent: "center",
      height: "500px",
      overflow: "scroll"
    },
    paper: {
      backgroundColor: theme.palette.background.paper,
      border: "2px solid #000",
      boxShadow: theme.shadows[5],
      padding: theme.spacing(2, 4, 3)
    }
  })
);

const ViewConfigButtonModal = ({
  filename,
  config
}: {
  filename: string;
  config: string;
}) => {
  const classes = useStyles();
  const [open, setOpen] = React.useState(false);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <Button variant="contained" size="small" onClick={handleOpen}>
        View YAML
      </Button>
      <Modal open={open} onClose={handleClose} className={classes.modal}>
        <div className={classes.paper}>
          <h2>{configFilename}</h2>
          <pre>{config}</pre>
        </div>
      </Modal>
    </>
  );
};
