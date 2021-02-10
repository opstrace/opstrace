/**
 * Copyright 2019-2021 Opstrace, Inc.
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

import React, { Reducer } from "react";
import CommandService from "../CommandService";
import { render, fireEvent } from "../../../utils/testutils";
import ThemeProvider from "../../../themes/Provider";
import dark from "../../../themes/dark";
import { PickerService, PickerState } from "../../Picker";
import { actions } from "../../Picker/reducer";
import { CommandServiceState } from "../types";

const handlerCommand = jest.fn();

const command1 = {
  id: "command-1",
  description: "Command 1",
  handler: handlerCommand,
  keybindings: ["escape"]
};

const mockState: CommandServiceState & PickerState = {
  commands: [command1],
  keyBindings: { escape: [command1] },
  activeProviderIndex: -1,
  text: "",
  providers: []
};

jest.mock("../../../hooks/useTypesafeReducer", () => {
  const originalModule = jest.requireActual(
    "../../../hooks/useTypesafeReducer"
  );
  return {
    ...originalModule,
    useTypesafeReducer: (
      a: Reducer<CommandServiceState, typeof actions>,
      b: CommandServiceState,
      c: typeof actions
    ) => originalModule.useTypesafeReducer(a, mockState, c)
  };
});

test("CommandService handle keyboard event and call command handler", async () => {
  wrap(
    <CommandService>
      <div />
    </CommandService>
  );

  fireEvent.keyDown(document, {
    key: "escape",
    code: "escape",
    keyCode: 27,
    charCode: 27
  });

  expect(handlerCommand).toHaveBeenCalledTimes(1);
});

const wrap = (children: React.ReactNode) => {
  return render(
    <ThemeProvider theme={dark}>
      <PickerService>{children}</PickerService>
    </ThemeProvider>
  );
};
