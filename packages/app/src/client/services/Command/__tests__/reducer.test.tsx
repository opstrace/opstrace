import { initialState, commandServiceReducer, actions } from "../reducer";

const command1 = {
  id: "command-1",
  description: "Command 1",
  handler: () => null,
  keybindings: ["shift"]
};

const command2 = {
  id: "command-2",
  description: "Command 2",
  handler: () => null,
  keybindings: ["mod+q", "shift"]
};

const mockState = {
  commands: [command1, command2],
  keyBindings: {
    "shift": [command1]
  }
};

test("return the initial state", () => {
  const reducer = commandServiceReducer(undefined, {} as any);

  expect(reducer).toEqual(initialState);
});

describe("handle register action", () => {
  test("add new command to commands list and keyBindings", () => {
    const command = {
      id: "command-3",
      description: "Command 3",
      handler: () => null,
      keybindings: ["mod+z"]
    };

    const reducer = commandServiceReducer(mockState, actions.register(command));

    expect(reducer.commands.length).toEqual(3);
    expect(reducer.commands[0]).toEqual(command);
    expect(reducer.keyBindings["mod+z"]).not.toBeNull();
  });

  test("don't change commands list when it already has this command and update keyBindings", () => {
    const reducer = commandServiceReducer(mockState, actions.register(command2));

    expect(reducer.commands.length).toEqual(2);
    expect(reducer.keyBindings["shift"].length).toEqual(2);
    expect(reducer.keyBindings["mod+q"]).not.toBeNull();
  });
});

describe("handle unregister action", () => {
  test("don't change state when command is unknown", () => {
    const command = {
      id: "command-3",
      description: "Command 3",
      handler: () => null,
      keybindings: ["shift"]
    };

    const reducer = commandServiceReducer(mockState, actions.unregister(command));

    expect(reducer).toEqual(mockState);
  });

  test("remove command from commands list and keyBindings when command is already registered", () => {
    const reducer = commandServiceReducer(mockState, actions.unregister(command1));

    expect(reducer.commands.length).toEqual(1);
    expect(reducer.keyBindings["shift"].length).toEqual(0);
  });
});