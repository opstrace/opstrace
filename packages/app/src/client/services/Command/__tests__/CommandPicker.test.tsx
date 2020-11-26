import React from "react";

import { render } from "../../../utils/testutils";
import CommandPicker from "../CommandPicker";
import { Command } from "../types";
import { PickerProvider } from "../../Picker";

const mockedUseCommandService = jest.fn();
const mockedUsePickerService = jest.fn();

jest.mock("../CommandService", () => {
  return {
    useCommandService: (command?: Command, dependencies?: any[]) =>
      mockedUseCommandService(command, dependencies)
  };
});

jest.mock("../../Picker", () => {
  return {
    usePickerService: (provider?: PickerProvider, dependencies?: any[]) =>
      mockedUsePickerService(provider, dependencies)
  };
});

describe("render CommandPicker", () => {
  const mockedCommandService = {
    executeCommand: jest.fn()
  };

  const mockedPickerService = {
    activatePickerWithText: jest.fn()
  };

  beforeEach(() => {
    mockedUseCommandService.mockReturnValue(mockedCommandService);
    mockedUsePickerService.mockReturnValue(mockedPickerService);
  });

  afterEach(() => {
    mockedUseCommandService.mockRestore();
    mockedUsePickerService.mockRestore();
    mockedCommandService.executeCommand.mockRestore();
    mockedPickerService.activatePickerWithText.mockRestore();
  });

  test("CommandPicker handle event with correct argument", async () => {
    render(<CommandPicker commands={[]} />);

    const commandProviderArgument = mockedUseCommandService.mock.calls[0][0];

    commandProviderArgument.handler(Event);
    expect(mockedPickerService.activatePickerWithText).toHaveBeenCalledWith(
      ">"
    );
  });

  test("CommandPicker has correct options", async () => {
    render(
      <CommandPicker
        commands={[
          {
            id: "command-id-1",
            description: "Command 1",
            handler: () => null
          },
          {
            id: "command-id-2",
            description: "Command 2",
            handler: () => null
          },
          {
            id: "command-id-3",
            description: "Command 3",
            handler: () => null,
            category: "Hidden"
          }
        ]}
      />
    );

    const provider = mockedUsePickerService.mock.calls[0][0];

    expect(provider.options).toEqual([
      {
        id: "command-id-1",
        text: "Command 1"
      },
      {
        id: "command-id-2",
        text: "Command 2"
      }
    ]);
  });
});
