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
import { PickerOption, usePickerService } from "../Picker";
import { useCommandService } from "./CommandService";
import { Command } from "./types";

const cmdID = "open-command-picker";

type CommandPickerProps = {
  commands: Command[];
};

function commandToPickerOption(cmd: Command): PickerOption {
  return {
    id: cmd.id,
    text: cmd.description,
    keybinding: cmd.keybindings
  };
}

function filterCommands(cmds: Command[]): PickerOption[] {
  return cmds
    .filter(
      cmd => cmd.id !== cmdID && cmd.category !== "Hidden" && !cmd.disabled
    )
    .map(commandToPickerOption);
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

  const { activatePickerWithText } = usePickerService(
    {
      activationPrefix: "",
      options: filterCommands(commands),
      onSelected: option => {
        cmdService.executeCommand(option.id);
      }
    },
    [commands]
  );

  return null;
}

export default React.memo(CommandPicker);
