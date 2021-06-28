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

import React, { useState, useCallback, useEffect } from "react";
import { pathOr, any } from "ramda";
import { isFunction, isUndefined, isNotUndefined } from "ramda-adjunct";
import { useDispatch } from "react-redux";
import { subHours, subYears } from "date-fns";

import {
  IntegrationProps,
  IntegrationPluginStatusCheckFilterType
} from "client/integrations/types";
import { INTEGRATION_STATUS, IntegrationStatus } from "state/integration/types";

import { usePrometheus, useLoki } from "client/hooks/useGrafana";
import { updateGrafanaStateForIntegration } from "state/integration/actions";

import { makeStyles } from "@material-ui/core/styles";
import CheckCircle from "@material-ui/icons/CheckCircle";
import Warning from "@material-ui/icons/Warning";
import HighlightOff from "@material-ui/icons/HighlightOff";
import green from "@material-ui/core/colors/green";
import orange from "@material-ui/core/colors/orange";
import red from "@material-ui/core/colors/red";

export default function Status(props: IntegrationProps) {
  const { integration, tenant, plugin } = props;
  const [status, setStatus] = useState(
    integration.grafana?.status || INTEGRATION_STATUS.pending
  );
  const [queryTime, setQueryTime] = useState(new Date());
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

  const makeFilter = useCallback(
    (filter: IntegrationPluginStatusCheckFilterType) => {
      filter = isFunction(filter) ? filter(props) : filter;

      console.log("makeFilter", filter);

      if (isUndefined(filter)) throw new Error("no grafana filter specified");

      return filter;
    },
    [props]
  );

  const errorLogsUri = useCallback(() => {
    let logQl = `{k8s_namespace_name="${
      tenant.name
    }-tenant",k8s_container_name="exporter",k8s_pod_name=~"^integration-${
      integration.key
    }-[a-z0-9-]*"} |= "stderr" ${makeFilter(plugin.status.error.lokiFilter)}`;
    const start = subHours(queryTime, 1);

    return encodeURI(
      `query_range?query=${logQl}&start=${1000 * 1000 * start.getTime()}&end=${
        1000 * 1000 * queryTime.getTime()
      }&limit=1&step=300`
    );
  }, [
    plugin.status.error.lokiFilter,
    tenant.name,
    integration.key,
    queryTime,
    makeFilter
  ]);

  const errorPromQlUri = useCallback(() => {
    throw new Error("todo");
  }, []);

  // we need to get all logs to see if there are any in the case when there are no errors, as if there are no errors or logs then we're still waiting for the exporter to start
  const startedLogsUri = useCallback(() => {
    const logQl = `{k8s_namespace_name="${
      tenant.name
    }-tenant",k8s_container_name="exporter",k8s_pod_name=~"^integration-${
      integration.key
    }-[a-z0-9-]*"} ${makeFilter(plugin.status.started.lokiFilter)}`;
    const start = subYears(queryTime, 5);

    return encodeURI(
      `query_range?query=${logQl}&direction=BACKWARD&limit=1&start=${
        1000 * 1000 * start.getTime()
      }&end=${1000 * 1000 * queryTime.getTime()}&step=86400`
    );
  }, [
    plugin.status.started.lokiFilter,
    tenant.name,
    integration.key,
    queryTime,
    makeFilter
  ]);

  const startedPromQlUri = useCallback(() => {
    throw new Error("todo");
  }, []);

  const { data: errorLogs } = useLoki(errorLogsUri, "system");
  const { data: errorMetrics } = usePrometheus(errorPromQlUri, "system");
  const { data: startedLogs } = useLoki(startedLogsUri, "system");
  const { data: startedMetrics } = usePrometheus(startedPromQlUri, "system");

  console.log({
    logs: { error: errorLogs, started: startedLogs },
    metrics: { error: errorMetrics, started: startedMetrics }
  });

  useEffect(() => {
    console.log(
      "any",
      any(isNotUndefined)([
        errorLogs,
        errorMetrics,
        startedLogs,
        startedMetrics
      ]),
      plugin
    );
    if (
      any(isNotUndefined)([
        errorLogs,
        errorMetrics,
        startedLogs,
        startedMetrics
      ])
    ) {
      const errorsPresent =
        (isFunction(plugin.status.error?.callback)
          ? plugin.status.error.callback({
              lokiData: errorLogs,
              prometheusData: errorMetrics,
              ...props
            })
          : pathOr([], ["data", "result", 0, "values"])(errorLogs)
        ).length > 0;
      const startedPresent =
        (isFunction(plugin.status.started?.callback)
          ? plugin.status.started.callback({
              lokiData: startedLogs,
              prometheusData: startedMetrics,
              ...props
            })
          : pathOr([], ["data", "result", 0, "values"])(startedLogs)
        ).length > 0;

      let latestStatus = INTEGRATION_STATUS.pending;
      if (errorsPresent) latestStatus = INTEGRATION_STATUS.error;
      else if (startedPresent) latestStatus = INTEGRATION_STATUS.active;

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
  }, [
    errorLogs,
    errorMetrics,
    startedLogs,
    startedMetrics,
    status,
    dispatch,
    integration.id,
    props,
    plugin
  ]);

  return <StatusBadge status={status} />;
}

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

export const StatusBadge = ({ status }: { status: IntegrationStatus }) => {
  const classes = useStyles();
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
};
