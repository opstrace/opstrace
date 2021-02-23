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

// import graphqlClient from "state/clients/graphqlClient";
import { useSelector, State } from "state/provider";
import { defaultBasicState } from "state/alertManagerConfig/defaultState";

export const getAlertManagerConfig = (state: State) => state.alertManagerConfig;

export default function useAlertManagerConfig() {
  let data = useSelector(getAlertManagerConfig) || defaultBasicState();

  // if (!data) {
  //   data = await graphqlClient.getTenantConfig({
  //     tenant_name: "tree_tops",
  //     key: "alertManagerConfig"
  //   });
  // }
  // // if (!data) data = defaultBasicState();

  return data;
}
