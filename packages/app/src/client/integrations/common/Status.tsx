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

import React, { useState, useMemo, useEffect } from "react";
import { pathOr } from "ramda";
import { useDispatch } from "react-redux";
import { subHours, subYears } from "date-fns";

import { IntegrationProps } from "client/integrations/types";
import { INTEGRATION_STATUS } from "state/integration/types";

import { usePrometheus, useLoki } from "client/hooks/useGrafana";
import { updateGrafanaStateForIntegration } from "state/integration/actions";

import { makeStyles } from "@material-ui/core/styles";
import CheckCircle from "@material-ui/icons/CheckCircle";
import Warning from "@material-ui/icons/Warning";
import HighlightOff from "@material-ui/icons/HighlightOff";
import green from "@material-ui/core/colors/green";
import orange from "@material-ui/core/colors/orange";
import red from "@material-ui/core/colors/red";

const useStyles = makeStyles(theme => ({
  integrationRow: {
    cursor: "pointer"
  },
  statusCell: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap"
  },
  statusActive: { color: green["500"] },
  statusText: {
    marginRight: 10
  },
  statusPending: {
    color: orange["500"]
  },
  statusError: {
    color: red["500"]
  }
}));

const usePromAndOrLoki = ({
  promPath,
  lokiPath,
  tenantName
}: {
  promPath: string;
  lokiPath: string;
  tenantName?: string;
}) => {};

export default function IntegrationStatus({
  integration,
  tenant,
  plugin
}: IntegrationProps) {
  const [status, setStatus] = useState(
    integration.grafana?.status || INTEGRATION_STATUS.pending
  );
  const [queryTime, setQueryTime] = useState(new Date());
  const classes = useStyles();
  const dispatch = useDispatch();

  useEffect(() => {
    let unmounted = false;
    const timer = setInterval(() => {
      if (!unmounted) {
        setQueryTime(new Date());
      }
    }, 2000);
    return () => {
      unmounted = true;
      clearTimeout(timer);
    };
  });

  const findErrorsQuery;

  const findErrorsInLogsUri = useMemo(() => {
    let logQl = `{k8s_namespace_name="${tenant.name}-tenant",k8s_container_name="exporter",k8s_pod_name=~"^integration-${integration.key}-[a-z0-9-]*"} |= "stderr" ${errorFilter}`;
    const start = subHours(queryTime, 1);

    return encodeURI(
      `query_range?query=${logQl}&start=${1000 * 1000 * start.getTime()}&end=${
        1000 * 1000 * queryTime.getTime()
      }&limit=1&step=300`
    );
  }, [tenant.name, integration.key, queryTime, errorFilter]);

  // we need to get all logs to see if there are any in the case when there are no errors, as if there are no errors or logs then we're still waiting for the exporter to start
  const findAllLogsUri = useMemo(() => {
    const logQl = `{k8s_namespace_name="${tenant.name}-tenant",k8s_container_name="exporter",k8s_pod_name=~"^integration-${integration.key}-[a-z0-9-]*"} ${activeFilter}`;
    const start = subYears(queryTime, 5);

    return encodeURI(
      `query_range?query=${logQl}&direction=BACKWARD&limit=1&start=${
        1000 * 1000 * start.getTime()
      }&end=${1000 * 1000 * queryTime.getTime()}&step=86400`
    );
  }, [tenant.name, integration.key, queryTime, activeFilter]);

  const { data: errorLogs } = useLoki(findErrorsInLogsUri, "system");
  const { data: allLogs } = useLoki(findAllLogsUri, "system");

  useEffect(() => {
    if (errorLogs !== undefined && allLogs !== undefined) {
      const errorCount = pathOr([], ["data", "result", 0, "values"])(errorLogs)
        .length;
      const logCount = pathOr([], ["data", "result", 0, "values"])(allLogs)
        .length;

      let latestStatus = INTEGRATION_STATUS.pending;
      if (errorCount > 0) latestStatus = INTEGRATION_STATUS.error;
      else if (logCount > 0) latestStatus = INTEGRATION_STATUS.active;

      if (latestStatus !== status) {
        dispatch(
          updateGrafanaStateForIntegration({
            id: integration.id,
            grafana: {
              status: latestStatus
            }
          })
        );
        setStatus(latestStatus);
      }
    }
  }, [errorLogs, allLogs, status, dispatch, integration.id]);

  if (status === INTEGRATION_STATUS.active)
    return (
      <div className={classes.statusCell}>
        <span className={classes.statusText}>Active</span>
        <CheckCircle className={classes.statusActive} />
      </div>
    );
  else if (status === INTEGRATION_STATUS.error)
    return (
      <div className={classes.statusCell}>
        <span className={classes.statusText}>Error</span>
        <HighlightOff className={classes.statusError} />
      </div>
    );
  else
    return (
      <div className={classes.statusCell}>
        <span className={classes.statusText}>Inactive</span>
        <Warning className={classes.statusPending} />
      </div>
    );
}
