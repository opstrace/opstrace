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
import { Meta } from "@storybook/react";

import { usePickerService } from "../Picker";
import { useCommandService } from "./CommandService";
import Services from "../index";
import { Button } from "client/components/Button";

export default {
  title: "Services/CommandService"
} as Meta;

function IWantToUseACommandService() {
  const cmdService = useCommandService({
    id: "my-command",
    description: "This is the description for 'my-command'",
    handler: () => alert("executed my-command")
  });

  const { activatePickerWithText } = usePickerService();

  return (
    <>
      <Button
        variant="contained"
        state="primary"
        onClick={() => cmdService.executeCommand("my-command")}
      >
        execute "my-command"
      </Button>
      <br />
      <br />
      <Button
        variant="contained"
        state="secondary"
        onClick={() => activatePickerWithText("")}
      >
        open command picker
      </Button>
      <br />
      <br />
      Use ⌘+⇧+p (mac) or ⌃+⇧+p (linux/windows) to open the command picker
    </>
  );
}

export const Default = (): JSX.Element => {
  return (
    <Services>
      <IWantToUseACommandService />
    </Services>
  );
};
