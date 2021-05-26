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
import { format, parseISO, getUnixTime, subHours } from "date-fns";

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

  const getUnixNanoSecTime = (date: Date) => getUnixTime(date) * 1000000000;

  const findErrorsInLogsUri = useMemo(() => {
    const logQl = `{k8s_namespace_name="${tenant.name}-tenant",k8s_container_name="exporter",k8s_pod_name=~"^exporter-${integration.key}-[a-z0-9-]*"} |= "stderr" |= "${ERROR_STR}"`;
    const end = new Date();
    const start = subHours(end, 1);

    return encodeURI(
      `query_range?direction=BACKWARD&limit=1000&query=${logQl}&start=${getUnixNanoSecTime(
        start
      )}&end=${getUnixNanoSecTime(end)}`
    );
  }, [tenant.name, integration.key]);

  // const errorLogsUrl = useMemo(() => {
  //   const path = `orgId=1&left=%5B%22now-1h%22,%22now%22,%22logs%22,%7B%22expr%22:%22%7Bk8s_namespace_name%3D%5C%22${tenant.name}-tenant%5C%22,k8s_container_name%3D%5C%22exporter%5C%22,k8s_pod_name%3D~%5C%22%5Eexporter-${integration.key}-%5Ba-z0-9-%5D*%5C%22%7D%20%7C%3D%20%5C%22stderr%5C%22%20%7C%3D%20%5C%22${ERROR_STR}%5C%22%22%7D%5D`;
  //   return `${window.location.protocol}//system.${window.location.host}/grafana/explore?${path}`;
  // }, [tenant.name, integration.key]);

  // const logsUrl = useMemo(() => {
  //   const path = `orgId=1&left=%5B%22now-1h%22,%22now%22,%22logs%22,%7B%22expr%22:%22%7Bk8s_namespace_name%3D%5C%22${tenant.name}-tenant%5C%22,k8s_container_name%3D%5C%22exporter%5C%22,k8s_pod_name%3D~%5C%22%5Eexporter-${integration.key}-%5Ba-z0-9-%5D*%5C%22%7D%22%7D%5D`;
  //   return `${window.location.protocol}//system.${window.location.host}/grafana/explore?${path}`;
  // }, [tenant.name, integration.key]);

  const { data: errorLogs } = useLoki(findErrorsInLogsUri, tenant.name);

  const errorCount = useMemo(() => {

    if errorLogs === undefined

    const errors = pathOr([], ["data", "result", 0, "values"])(errorLogs);
    const errorCount = errors.length;
    const text = "in the last hour";

    if (logs === undefined) return <span>unknown</span>;
    else if (errorCount === 1)
      return (
        <a href={url} target="_blank" rel="noreferrer">
          1 error {text}
        </a>
      );
    else if (errorCount > 1)
      return (
        <a href={url} target="_blank" rel="noreferrer">
          {errorCount} errors {text}
        </a>
      );
    else return null;
  }, [exporterLogs]);

  useEffect(() => {
    if (data !== undefined) {
      const status = pathOr("error", ["status"])(data);
      const metrics = pathOr([], ["data", "result"])(data);
      setStatus(
        status === "success" && metrics.length > 0
          ? Status.active
          : Status.pending
      );
    }
  }, [data]);

  if (status === Status.active)
    return (
      <div className={classes.statusCell}>
        <span className={classes.statusText}>Active </span>
        <CheckCircle className={classes.statusActive} />
      </div>
    );
  else if (status === Status.error)
    return (
      <div className={classes.statusCell}>
        <span className={classes.statusText}>Error </span>
        <HighlightOff className={classes.statusError} />
      </div>
    );
  else
    return (
      <div className={classes.statusCell}>
        <span className={classes.statusText}>Inactive </span>
        <Warning className={classes.statusPending} />
      </div>
    );
}
