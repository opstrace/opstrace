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

import {
  promtailYaml,
  PromtailLogFormat
} from "./templates/config";
import * as commands from "./templates/commands";
import {
  makeFolderRequest,
  makePromtailDashboardRequests
} from "./dashboards";

import { CheckStatusBtn } from "./CheckStatusBtn";
import { CopyToClipboardIcon } from "client/viewsBasic/common/CopyToClipboard";

import useHasuraSubscription from "client/hooks/useHasuraSubscription";

import graphqlClient from "state/clients/graphqlClient";

import { CondRender } from "client/utils/rendering";

import { Box } from "client/components/Box";
import Attribute from "client/components/Attribute";
import { Card, CardContent, CardHeader } from "client/components/Card";
import { Button } from "client/components/Button";

import { makeStyles, Theme, createStyles } from "@material-ui/core/styles";
import Modal from "@material-ui/core/Modal";
import { ExternalLink } from "client/components/Link";

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

const configFilename = "opstrace-promtail.yaml";

const INTEGRATION_STATUS_SUBSCRIPTION = `
  subscription IntegrationUpdates($id: uuid!) {
    integrations_by_pk(id: $id) {
      status
      grafana_metadata
      updated_at
    }
  }
`;

export const K8sLogsShow = withTenantFromParams(
  ({
    integration,
    integrationDef,
    tenant
  }: IntegrationProps & IntegrationDefProps & TenantProps) => {
    const history = useHistory();

    const { data: subData } = useHasuraSubscription(
      INTEGRATION_STATUS_SUBSCRIPTION,
      {
        id: integration.id
      }
    );

    const status = useMemo(() => {
      return subData?.integrations_by_pk?.status || integration.status;
    }, [subData?.integrations_by_pk?.status, integration.status]);

    const grafanaMetadata = useMemo(() => {
      return (
        subData?.integrations_by_pk?.grafana_metadata ||
        integration.grafana_metadata
      );
    }, [
      subData?.integrations_by_pk?.grafana_metadata,
      integration.grafana_metadata
    ]);

    const config = useMemo(() => {
      return promtailYaml({
        clusterHost: window.location.host,
        tenantName: tenant.name,
        integrationId: integration.id,
        deployNamespace: integration.data.deployNamespace,
        // TODO: allow user to select dockerd or cri/containerd (different log formats)
        logFormat: PromtailLogFormat.CRI
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
        makeFolderRequest({
          integrationId: integration.id,
          integrationName: integration.name
        })
      );

      for (const d of makePromtailDashboardRequests({
        integrationId: integration.id,
        folderId: folder.id
      })) {
        await createDashboard(tenant.name, d);
      }

      await graphqlClient.UpdateIntegrationGrafanaMetadata({
        id: integration.id,
        grafana_metadata: {
          folder_id: folder.id,
          folder_path: folder.urlPath as string
        }
      });
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
                  <CondRender present={grafanaMetadata?.folder_path}>
                    <Attribute.Key> </Attribute.Key>
                  </CondRender>
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
                <CondRender present={grafanaMetadata?.folder_path}>
                  <Attribute.Key>
                    <ExternalLink
                      target="_blank"
                      href={`${window.location.protocol}//${tenant.name}.${window.location.host}${grafanaMetadata?.folder_path}`}
                    >
                      View Grafana Dashboards
                    </ExternalLink>
                  </Attribute.Key>
                </CondRender>
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
                    {`Step 2. Run this command to install Promtail`}
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
                      disabled={grafanaMetadata.folder_path !== undefined}
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
