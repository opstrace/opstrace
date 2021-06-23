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
import classNames from "classnames";
import { subHours } from "date-fns";
import { makeStyles } from "@material-ui/core/styles";
import CheckCircle from "@material-ui/icons/CheckCircle";
import Warning from "@material-ui/icons/Warning";
import green from "@material-ui/core/colors/green";
import orange from "@material-ui/core/colors/orange";

import { usePrometheus } from "client/hooks/useGrafana";

import { Integration, INTEGRATION_STATUS } from "state/integration/types";
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
  statusIcon: { color: green["500"] },
  statusText: {
    marginRight: 10
  },
  statusPending: {
    color: orange["500"]
  }
}));

export default function K8sMetricsStatus({ integration, tenant }: Props) {
  const [status, setStatus] = useState("pending");
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

  const statusCheckUri = useMemo(() => {
    const promQl = `process_cpu_seconds_total{integration_id="${integration.id}"}`;
    const start = subHours(queryTime, 1);

    return encodeURI(
      `query_range?query=${promQl}&start=${start.toISOString()}&end=${queryTime.toISOString()}&step=300`
    );
  }, [integration.id, queryTime]);

  const { data } = usePrometheus(statusCheckUri, tenant.name);

  useEffect(() => {
    if (data !== undefined) {
      const status = pathOr("error", ["status"])(data);
      const metrics = pathOr([], ["data", "result"])(data);
      setStatus(
        status === "success" && metrics.length > 0
          ? INTEGRATION_STATUS.active
          : INTEGRATION_STATUS.pending
      );
    }
  }, [data]);

  return (
    <div>
      {status === INTEGRATION_STATUS.active ? (
        <div className={classes.statusCell}>
          <span className={classes.statusText}>Active </span>
          <CheckCircle className={classes.statusIcon} />
        </div>
      ) : (
        <div className={classes.statusCell}>
          <span className={classes.statusText}>Inactive </span>
          <Warning
            className={classNames(classes.statusIcon, classes.statusPending)}
          />
        </div>
      )}
    </div>
  );
}
