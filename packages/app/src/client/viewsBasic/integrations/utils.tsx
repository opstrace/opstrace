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
import { Integration, Integrations } from "state/integrations/types";
export { Integration, Integrations };

import Skeleton from "@material-ui/lab/Skeleton";

export const withIntegration = <T extends {}>(
  Component: React.ReactType,
  id: string
) => {
  return (props: T) => {
    const integration = useIntegration(id);

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
    const { integrationId } = useParams<{ integrationId: string }>();
    const ComponentWithIntegration = withIntegration<T>(
      Component,
      integrationId
    );
    return <ComponentWithIntegration {...props} />;
  };
};

export type IntegrationProps = {
  integration: Integration;
};

export const withIntegrationList = <T extends {}>(
  Component: React.ReactType
) => {
  return (props: T) => {
    const integrationList = useIntegrationList();

    return integrationList ? (
      <Component {...props} integrationList={integrationList} />
    ) : (
      <Skeleton variant="rect" width="100%" height="100%" animation="wave" />
    );
  };
};

export type IntegrationListProps = {
  integration: Integrations;
};
