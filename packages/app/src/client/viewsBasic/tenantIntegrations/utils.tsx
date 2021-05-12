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
import { useParams } from "react-router-dom";

import { useIntegration, useIntegrationList } from "state/integrations/hooks";
import { useTenant } from "state/tenant/hooks";
import { Integration, Integrations } from "state/integrations/types";
import { Tenant } from "state/tenant/types";

import Skeleton from "@material-ui/lab/Skeleton";

export { Integration, Integrations };

export const withIntegration = <T extends {}>(
  Component: React.ReactType,
  tenant: Tenant | string,
  id: string
) => {
  return (props: T) => {
    const integration = useIntegration(tenant, id);

    return integration ? (
      <Component {...props} integration={integration} />
    ) : (
      <Skeleton variant="rect" width="100%" height="100%" animation="wave" />
    );
  };
};

export const withIntegrationFromParams = <T extends {}>(
  Component: React.ReactType
) => {
  return (props: T) => {
    const { tenantId, integrationId } = useParams<{
      tenantId: string;
      integrationId: string;
    }>();

    const tenant = useTenant(tenantId);

    if (tenant) {
      const ComponentWithIntegration = withIntegration<T>(
        Component,
        tenant,
        integrationId
      );
      return <ComponentWithIntegration {...props} />;
    } else {
      return (
        <Skeleton variant="rect" width="100%" height="100%" animation="wave" />
      );
    }
  };
};

export type IntegrationProps = {
  integration: Integration;
};

export const withIntegrationList = <T extends {}>(
  Component: React.ReactType,
  tenant: Tenant | string
) => {
  return (props: T) => {
    const integrationList = useIntegrationList(tenant);

    return integrationList ? (
      <Component {...props} integrationList={integrationList} />
    ) : (
      <Skeleton variant="rect" width="100%" height="100%" animation="wave" />
    );
  };
};

export const withIntegrationListFromParams = <T extends {}>(
  Component: React.ReactType
) => {
  return (props: T) => {
    const { tenantId } = useParams<{
      tenantId: string;
    }>();

    const tenant = useTenant(tenantId);

    if (tenant) {
      const ComponentWithIntegrationList = withIntegrationList<T>(
        Component,
        tenant
      );
      return <ComponentWithIntegrationList {...props} />;
    } else {
      return (
        <Skeleton variant="rect" width="100%" height="100%" animation="wave" />
      );
    }
  };
};

export type IntegrationListProps = {
  integrationList: Integrations;
};
