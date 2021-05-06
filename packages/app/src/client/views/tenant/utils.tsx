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
import { map } from "ramda";
import { useParams } from "react-router-dom";

import useTenant from "state/tenant/hooks/useTenant";
import useAlertmanager from "state/tenant/hooks/useAlertmanager";

import { Tenant, Tenants, Alertmanager } from "state/tenant/types";
import { PanelItem } from "client/components/Panel";

import Skeleton from "@material-ui/lab/Skeleton";

export { Tenant, Alertmanager };

export const tenantToItem = (tenant: Tenant): PanelItem => {
  return { id: tenant.name, text: tenant.name, data: tenant };
};

export const tenantsToItems: (tenants: Tenants) => PanelItem[] = map(
  tenantToItem
);

export const withTenant = <T extends {}>(
  Component: React.ReactType,
  tenantName: string
) => {
  return (props: T) => {
    const tenant = useTenant(tenantName);

    return tenant ? (
      <Component {...props} tenant={tenant} />
    ) : (
      <Skeleton variant="rect" width="100%" height="100%" animation="wave" />
    );
  };
};

export const withTenantFromParams = <T extends {}>(
  Component: React.ReactType
) => {
  return (props: T) => {
    const { tenantId } = useParams<{ tenantId: string }>();
    const ComponentWithTenant = withTenant<T>(Component, tenantId);
    return <ComponentWithTenant {...props} />;
  };
};

export type TenantProps = {
  tenant: Tenant;
};

export const withAlertmanager = <T extends {}>(
  Component: React.ReactType,
  tenantId: string
) => {
  const ComponentWithAlertmanager = ({ tenant, ...rest }: T & TenantProps) => {
    const alertmanager = useAlertmanager(tenant.name);

    return alertmanager ? (
      <Component {...rest} tenant={tenant} alertmanager={alertmanager} />
    ) : (
      <Skeleton variant="rect" width="100%" height="100%" animation="wave" />
    );
  };

  return withTenant<T & TenantProps>(ComponentWithAlertmanager, tenantId);
};

export const withAlertmanagerFromParams = <T extends {}>(
  Component: React.ReactType
) => {
  return (props: T & TenantProps) => {
    const { tenantId } = useParams<{ tenantId: string }>();
    const ComponentWithTenant = withAlertmanager<T & TenantProps>(
      Component,
      tenantId
    );
    return <ComponentWithTenant {...props} />;
  };
};

export type AlertmanagerProps = {
  alertmanager: Alertmanager;
};
