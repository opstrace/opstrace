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

import { usePickerService } from "client/services/Picker";
import { useCommandService } from "client/services/Command";
import { createModule } from "state/module/actions";
import { useDispatch } from "react-redux";
import { useHistory } from "react-router-dom";
import { moduleNameRegex } from "state/module/types";

const CreateModulePicker = () => {
  const dispatch = useDispatch();
  const history = useHistory();

  const { activatePickerWithText } = usePickerService(
    {
      title: "Enter module name",
      activationPrefix: "create module:",
      disableFilter: true,
      textValidator: moduleNameRegex,
      options: [
        {
          id: "yes",
          text: `create`
        },
        {
          id: "no",
          text: "cancel"
        }
      ],
      onSelected: (option, module) => {
        if (option.id === "yes" && module) {
          dispatch(createModule({ name: module, history }));
        }
      }
    },
    [history]
  );

  useCommandService({
    id: "create-module-picker",
    description: "Create Module",
    keybindings: ["mod+m"],
    handler: e => {
      e.keyboardEvent?.preventDefault();
      activatePickerWithText("create module: ");
    }
  });

  return null;
};

export default React.memo(CreateModulePicker);
