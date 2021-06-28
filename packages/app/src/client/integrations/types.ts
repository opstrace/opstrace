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

import { Integration } from "state/integration/types";
import { Tenant } from "state/tenant/types";

export type IntegrationPlugin = {
  kind: string;
  category: string;
  label: string;
  desc: string | React.ReactType;
  Logo?: string;
  disabled?: boolean;
  Form: React.ReactType;
  detailSections?: IntegrationPluginDetailSection[];
  actions?: IntegrationPluginAction[];
  status: IntegrationPluginStatus;
  installCallback?: (props: IntegrationProps) => Promise<void>;
  uninstallCallback?: (props: IntegrationProps) => Promise<void>;
  hasInstallCompleted?: (props: IntegrationProps) => Promise<boolean>;
  canUninstall?: boolean | ((props: IntegrationProps) => boolean);
};

// export type IntegrationPluginCallbacks = {
//   install?: (props: IntegrationProps) => Promise<void>;
//   uninstall?: (props: IntegrationProps) => Promise<void>;
//   hasInstall?: (props: IntegrationProps) => Promise<boolean>;
// }

type IntegrationPluginStatus = {
  started: IntegrationPluginStatusCheck;
  error: IntegrationPluginStatusCheck;
};

export type IntegrationPluginStatusCheckFilterType =
  | string
  | ((props: IntegrationProps) => string | undefined)
  | undefined;

export type IntegrationpluginStatusCheckCallbackType = {
  lokiData?: {};
  prometheusData?: {};
} & IntegrationProps;

type IntegrationPluginStatusCheck = {
  lokiFilter?: IntegrationPluginStatusCheckFilterType;
  promQl?: IntegrationPluginStatusCheckFilterType;
  callback?: (props: IntegrationpluginStatusCheckCallbackType) => [];
};

export type IntegrationPluginAction = {
  label: string | ((props: IntegrationProps) => string);
  enabled?: (props: IntegrationProps) => boolean;
  confirmation?: boolean;
  callback?: (props: IntegrationProps) => null;
  Component: (props: IntegrationProps) => JSX.Element;
};

export type IntegrationPluginDetailSection = {
  label: string | ((props: IntegrationProps) => string);
  Component: (props: IntegrationProps) => JSX.Element;
};

export type IntegrationPlugins = IntegrationPlugin[];
export type IntegrationPluginRecords = Record<string, IntegrationPlugin>;

export type IntegrationProps = {
  integration: Integration;
  tenant: Tenant;
  plugin: IntegrationPlugin;
};
