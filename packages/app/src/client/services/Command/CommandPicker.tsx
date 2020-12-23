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

import React, { useCallback } from "react";
import { PickerOption, usePickerService } from "../Picker";
import { useCommandService } from "./CommandService";
import { Command } from "./types";
import { getKeysFromKeybinding } from "client/services/Command/util";
import Box from "client/components/Box/Box";

const cmdID = "open-command-picker";

type CommandPickerProps = {
  commands: Command[];
};

function commandToPickerOption(cmd: Command): PickerOption {
  return {
    id: cmd.id,
    text: cmd.description
  };
}

function filterCommands(cmds: Command[]): PickerOption[] {
  return cmds
    .filter(
      cmd => cmd.id !== cmdID && cmd.category !== "Hidden" && !cmd.disabled
    )
    .map(commandToPickerOption);
}

function renderKeybindings(data?: Command) {
  if (!data?.keybindings?.length) {
    return null;
  }

  const keybindings = data.keybindings.map(keys => getKeysFromKeybinding(keys));

  return (
    <Box display="flex">
      {keybindings.map((keys, idx) => (
        <Box display="flex" ml={1} key={`keybinding-${idx}`}>
          {keys.map((keyCode, partIdx) => (
            <Box
              bgcolor="grey.500"
              p={0.3}
              ml={0.3}
              key={`keybinding-key-${partIdx}`}
            >
              {keyCode}
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
}

function CommandPicker({ commands }: CommandPickerProps) {
  const cmdService = useCommandService({
    id: cmdID,
    description: "Show and Run Commands",
    handler: e => {
      e.keyboardEvent?.preventDefault();
      activatePickerWithText("");
    },
    keybindings: ["mod+p"]
  });

  const getCommand = useCallback(
    id => commands.find(command => command.id === id),
    [commands]
  );

  const { activatePickerWithText } = usePickerService(
    {
      activationPrefix: "",
      options: filterCommands(commands),
      onSelected: option => {
        cmdService.executeCommand(option.id);
      },
      secondaryAction: option => renderKeybindings(getCommand(option.id))
    },
    [commands]
  );

  return null;
}

export default React.memo(CommandPicker);
