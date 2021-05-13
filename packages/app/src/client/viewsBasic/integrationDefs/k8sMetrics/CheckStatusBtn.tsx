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
import { pathOr } from "ramda";
import { subHours } from "date-fns";

import { usePrometheus } from "client/hooks/useGrafana";

import { Integration } from "state/integrations/types";
import { Tenant } from "state/tenant/types";

import { Button } from "client/components/Button";

type Props = {
  integration: Integration;
  tenant: Tenant;
};

export const CheckStatusBtn = ({ integration, tenant }: Props) => {
  const [checkingStatus, setCheckingStatus] = React.useState(false);
  const statusCheckUri = useMemo(() => {
    const logQl = `process_cpu_seconds_total{integration_id="${integration.id}"}`;
    const end = new Date();
    const start = subHours(end, 1);

    return encodeURI(
      `query_range?query=${logQl}&start=${start.toISOString()}&end=${end.toISOString()}&step=300`
    );
  }, [integration.id]);

  const statusUpdateHandler = (metricsFound: boolean) => {
    console.log(metricsFound ? "active" : "pending");
    setCheckingStatus(false);
  };

  if (checkingStatus)
    return (
      <CheckingStatusBtn
        statusCheckUri={statusCheckUri}
        tenantName={tenant.name}
        statusUpdateHandler={statusUpdateHandler}
      />
    );
  else
    return (
      <Button
        variant="outlined"
        state="info"
        size="small"
        onClick={() => {
          setCheckingStatus(true);
        }}
      >
        Check Status
      </Button>
    );
};

const CheckingStatusBtn = ({
  statusCheckUri,
  tenantName,
  statusUpdateHandler
}: {
  statusCheckUri: string;
  tenantName: string;
  statusUpdateHandler: Function;
}) => {
  const { data } = usePrometheus(statusCheckUri, tenantName);

  useEffect(() => {
    if (data !== undefined) {
      const status = pathOr("error", ["status"])(data);
      const metrics = pathOr([], ["data", "result"])(data);
      statusUpdateHandler(status === "success" && metrics.length > 0);
    }
  }, [data]);

  return (
    <Button variant="outlined" state="info" size="small" disabled>
      Checking...
    </Button>
  );
};
