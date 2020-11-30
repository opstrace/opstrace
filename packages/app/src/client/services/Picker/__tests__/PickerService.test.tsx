import React, { Reducer } from "react";
import PickerService from "../PickerService";
import { render, screen, fireEvent } from "../../../utils/testutils";
import ThemeProvider from "../../../themes/Provider";
import light from "../../../themes/light";
import { PickerState } from "../types";
import { actions } from "../reducer";

const selectFirstProviderOption = jest.fn();
const selectSecondProviderOption = jest.fn();

const mockState = {
  activeProviderIndex: 0,
  text: "provider-1",
  providers: [
    {
      activationPrefix: "provider-1",
      onSelected: selectFirstProviderOption,
      options: [
        {
          id: "option-1",
          text: "option 1"
        },
        {
          id: "option-2",
          text: "option 2"
        },
        {
          id: "option-3",
          text: "option 3"
        }
      ]
    },
    {
      activationPrefix: "provider-2",
      onSelected: selectSecondProviderOption,
      options: [
        {
          id: "option-4",
          text: "option 4"
        },
        {
          id: "option-5",
          text: "option 5"
        }
      ]
    }
  ]
};

jest.mock("../../../hooks/useTypesafeReducer", () => {
  const originalModule = jest.requireActual(
    "../../../hooks/useTypesafeReducer"
  );
  return {
    ...originalModule,
    useTypesafeReducer: (
      a: Reducer<PickerState, typeof actions>,
      b: PickerState,
      c: typeof actions
    ) => originalModule.useTypesafeReducer(a, mockState, c)
  };
});

beforeEach(() => {
  jest.resetModules();
});

test("service has dialog element when activeProviderIndex > -1", async () => {
  wrap(
    <PickerService>
      <div />
    </PickerService>
  );

  const dialogElement = await screen.queryByTestId("dialog");

  expect(dialogElement).toBeInTheDocument();
});

test("select last option within range", async () => {
  wrap(
    <PickerService>
      <div />
    </PickerService>
  );

  const providerTextInput = await screen.findByDisplayValue("provider-1");

  expect(providerTextInput).toBeInTheDocument();

  ["ArrowDown", "ArrowDown", "ArrowDown", "ArrowDown", "Enter"].map(key =>
    fireEvent.keyDown(providerTextInput, { key })
  );

  expect(selectFirstProviderOption).toHaveBeenCalledWith(
    {
      id: "option-3",
      text: "option 3"
    },
    ""
  );
});

test("change provider and select first option within range", async () => {
  wrap(
    <PickerService>
      <div />
    </PickerService>
  );

  const providerTextInput = await screen.findByLabelText("picker filter");
  expect(providerTextInput).toBeInTheDocument();

  fireEvent.change(providerTextInput, { target: { value: "provider-2" } });

  ["ArrowUp", "ArrowUp", "ArrowUp", "Enter"].map(key =>
    fireEvent.keyDown(providerTextInput, { key })
  );

  expect(selectSecondProviderOption).toHaveBeenCalledWith(
    {
      id: "option-4",
      text: "option 4"
    },
    ""
  );
});

const wrap = (children: React.ReactNode) => {
  return render(<ThemeProvider theme={light}>{children}</ThemeProvider>);
};
