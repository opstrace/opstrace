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

import React, { useCallback, useEffect, useContext, useMemo } from "react";
import hotkeys from "hotkeys-js";

import type {
  Command,
  CommandEvent,
  CommandServiceApi,
  CommandServiceState
} from "./types";
import { useTypesafeReducer } from "client/hooks/useTypesafeReducer";
import { actions, commandServiceReducer, initialState } from "./reducer";
import CommandPicker from "./CommandPicker";

class CommandServiceChildren extends React.PureComponent {
  render() {
    return this.props.children;
  }
}

const commandServiceContext = React.createContext<CommandServiceApi | null>(
  null
);

function CommandContextProvider({ children }: { children: React.ReactNode }) {
  const [state, { register, unregister }] = useTypesafeReducer<
    CommandServiceState,
    typeof actions
  >(commandServiceReducer, initialState, actions);

  const executeCommand = useCallback(
    (id: string, args?: any[], e?: CommandEvent) => {
      const cmd = state.commands.find(cmd => cmd.id === id);

      if (cmd) {
        cmd.handler(e || { preventNext: () => {} }, args);
      }
    },
    [state.commands]
  );

  // rebind keybindings whenever our keyBinding state changes
  useEffect(() => {
    function handleKeyboardEvent(e: KeyboardEvent, { key }: { key: string }) {
      if (key in state.keyBindings) {
        const cmds = state.keyBindings[key];
        let abort = false;

        const event: CommandEvent = {
          keyboardEvent: e,
          preventNext: () => (abort = true)
        };
        let idx = 0;
        while (!abort && idx < cmds.length) {
          cmds[idx++].handler(event);
        }
      }
    }

    const keybindings = Object.keys(state.keyBindings);
    keybindings.forEach(kb => hotkeys(kb, handleKeyboardEvent));

    return () =>
      keybindings.forEach(kb => hotkeys.unbind(kb, handleKeyboardEvent));
  }, [state.keyBindings]);

  const commandService: CommandServiceApi = {
    register,
    unregister,
    executeCommand
  };

  return (
    <commandServiceContext.Provider value={commandService}>
      <CommandServiceChildren>{children}</CommandServiceChildren>
      <CommandPicker commands={state.commands} />
    </commandServiceContext.Provider>
  );
}

export function useCommandService(command?: Command, dependencies?: any[]) {
  const commandService = useContext(commandServiceContext);
  if (!commandService) {
    throw new Error("useCommandService must be used within a CommandService.");
  }

  useEffect(() => {
    if (command) {
      commandService.register(command);
    }
    // automatically unregister when unmounted
    return () => {
      if (command) commandService.unregister(command);
    };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, dependencies || []);

  return useMemo(() => ({ executeCommand: commandService.executeCommand }), [
    commandService.executeCommand
  ]);
}

export default React.memo(CommandContextProvider);
