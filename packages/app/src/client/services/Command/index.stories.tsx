import React from "react";

import { usePickerService } from "../Picker";
import { useCommandService } from "./CommandService";
import Services from "../index";
import { Button } from "client/components/Button";

export default {
  title: "Services/CommandService"
};

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
        onClick={() => activatePickerWithText("> ")}
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
