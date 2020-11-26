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
}

const displayService = React.createContext<DisplayServiceApi | null>(null);

class DisplayServiceProviderChildren extends React.PureComponent {
  render() {
    return this.props.children;
  }
}

function DisplayService({ children }: { children: React.ReactNode }) {
  const [state, { setSidebarVisible }] = useTypesafeReducer<
    DisplayServiceState,
    typeof actions
  >(displayServiceReducer, initialState, actions);

  const api: DisplayServiceApi = {
    state,
    setSidebarVisible
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
