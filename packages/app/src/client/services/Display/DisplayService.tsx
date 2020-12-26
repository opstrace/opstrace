/**
 * Copyright 2020 Opstrace, Inc.
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

import { useTypesafeReducer } from "../../hooks/useTypesafeReducer";
import {
  actions,
  displayServiceReducer,
  initialState,
  DisplayServiceState
} from "./reducer";

interface DisplayServiceApi {
  state: DisplayServiceState;
  setSidebarVisible: (visible: boolean) => void;
  setSidebarWidth: (size: number) => void;
}

const displayService = React.createContext<DisplayServiceApi | null>(null);

class DisplayServiceProviderChildren extends React.PureComponent {
  render() {
    return this.props.children;
  }
}

function DisplayService({ children }: { children: React.ReactNode }) {
  const [state, { setSidebarVisible, setSidebarWidth }] = useTypesafeReducer<
    DisplayServiceState,
    typeof actions
  >(displayServiceReducer, initialState, actions);

  const api: DisplayServiceApi = {
    state,
    setSidebarVisible,
    setSidebarWidth
  };

  return (
    <displayService.Provider value={api}>
      <DisplayServiceProviderChildren>
        {children}
      </DisplayServiceProviderChildren>
    </displayService.Provider>
  );
}

export function useDisplayService() {
  const displayServiceApi = React.useContext(displayService);
  if (!displayServiceApi) {
    throw new Error("useDisplayService must be used within a DisplayService.");
  }
  return displayServiceApi;
}

export default React.memo(DisplayService);
