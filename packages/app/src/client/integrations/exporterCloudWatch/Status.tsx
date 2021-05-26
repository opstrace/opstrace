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
import { subHours } from "date-fns";

import { useLoki } from "client/hooks/useGrafana";

import { makeStyles } from "@material-ui/core/styles";
import CheckCircle from "@material-ui/icons/CheckCircle";
import Warning from "@material-ui/icons/Warning";
import HighlightOff from "@material-ui/icons/HighlightOff";
import green from "@material-ui/core/colors/green";
import orange from "@material-ui/core/colors/orange";
import red from "@material-ui/core/colors/red";

import {
  Integration,
  IntegrationStatus as Status
} from "state/integration/types";
import { Tenant } from "state/tenant/types";

type Props = {
  integration: Integration;
  tenant: Tenant;
};

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

const ERROR_STR = "Exception:";

export default function ExporterCloudWatchStatus({
  integration,
  tenant
}: Props) {
  const [status, setStatus] = useState(Status.pending);
  const [queryTime, setQueryTime] = useState(new Date());
  const classes = useStyles();

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

  const findErrorsInLogsUri = useMemo(() => {
    const logQl = `{k8s_namespace_name="${tenant.name}-tenant",k8s_container_name="exporter",k8s_pod_name=~"^exporter-${integration.key}-[a-z0-9-]*"} |= "stderr" |= "${ERROR_STR}"`;
    const end = new Date();
    const start = subHours(end, 1);

    return encodeURI(
      `query_range?query=${logQl}&start=${1000 * 1000 * start.getTime()}&end=${
        1000 * 1000 * queryTime.getTime()
      }&limit=1&step=300`
    );
  }, [tenant.name, integration.key, queryTime]);

  // we need to get all logs to see if there are any in the case when there are no errors, as if there are no errors or logs then we're still waiting for the exporter to start
  const findAllLogsUri = useMemo(() => {
    const logQl = `{k8s_namespace_name="${tenant.name}-tenant",k8s_container_name="exporter",k8s_pod_name=~"^exporter-${integration.key}-[a-z0-9-]*"}`;
    const end = new Date();
    const start = subHours(end, 1);

    return encodeURI(
      `query_range?query=${logQl}&start=${1000 * 1000 * start.getTime()}&end=${
        1000 * 1000 * queryTime.getTime()
      }&limit=1&step=300`
    );
  }, [tenant.name, integration.key, queryTime]);

  const { data: errorLogs } = useLoki(findErrorsInLogsUri, tenant.name);
  const { data: allLogs } = useLoki(findAllLogsUri, tenant.name);

  useEffect(() => {
    if (errorLogs !== undefined && allLogs !== undefined) {
      const errorCount = pathOr([], ["data", "result", 0, "values"])(errorLogs)
        .length;
      const logCount = pathOr([], ["data", "result", 0, "values"])(allLogs)
        .length;

      if (errorCount > 0) setStatus(Status.error);
      else if (logCount > 0) setStatus(Status.active);
      else setStatus(Status.pending);
    }
  }, [errorLogs, allLogs]);

  if (status === Status.active)
    return (
      <div className={classes.statusCell}>
        <span className={classes.statusText}>Active</span>
        <CheckCircle className={classes.statusActive} />
      </div>
    );
  else if (status === Status.error)
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
