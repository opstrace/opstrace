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

import { createReducer, ActionType, createAction } from "typesafe-actions";
import { CommandServiceState, Command, KeyBindingState } from "./types";
import { replaceModKeyWithPlatformMetaKey } from "./util";

export const actions = {
  register: createAction("REGISTER_COMMAND")<Command>(),
  unregister: createAction("UNREGISTER_COMMAND")<Command>()
};

type Actions = ActionType<typeof actions>;

function removeCommand(commands: Command[], command: Command): Command[] {
  return commands.filter(c => c.id !== command.id);
}

export const initialState: CommandServiceState = {
  commands: [],
  keyBindings: {}
};

function getKeybindings(command: Command): string[] | null {
  if (!command.keybindings || command.keybindings.length === 0) {
    return null;
  }
  return command.keybindings.map(replaceModKeyWithPlatformMetaKey);
}

function addKeyBindingsForCommand(
  state: KeyBindingState,
  command: Command
): KeyBindingState {
  const keybindings = getKeybindings(command);
  if (!keybindings) {
    return state;
  }
  return keybindings.reduce<KeyBindingState>((state, keybinding) => {
    const existingCmds = state[keybinding] || [];
    return {
      ...state,
      [keybinding]: [command].concat(
        existingCmds.filter(cmd => cmd.id !== command.id)
      )
    };
  }, state);
}

function removeKeyBindingsForCommand(
  state: KeyBindingState,
  command: Command
): KeyBindingState {
  const keybindings = getKeybindings(command);
  if (!keybindings) {
    return state;
  }
  return keybindings.reduce<KeyBindingState>((state, keybinding) => {
    return {
      ...state,
      [keybinding]: (state[keybinding] || []).filter(
        cmd => cmd.id !== command.id
      )
    };
  }, state);
}

export const commandServiceReducer = createReducer<
  CommandServiceState,
  Actions
>(initialState)
  .handleAction(
    actions.register,
    (state, action): CommandServiceState => {
      // add new commands to the front of the array so we execute
      // commands in order of most recently registered
      const commands = [action.payload].concat(
        removeCommand(state.commands, action.payload)
      );
      const keyBindings = addKeyBindingsForCommand(
        state.keyBindings,
        action.payload
      );
      return {
        ...state,
        commands,
        keyBindings
      };
    }
  )
  .handleAction(
    actions.unregister,
    (state, action): CommandServiceState => {
      const commands = removeCommand(state.commands, action.payload);
      const keyBindings = removeKeyBindingsForCommand(
        state.keyBindings,
        action.payload
      );
      return {
        ...state,
        commands,
        keyBindings
      };
    }
  );
