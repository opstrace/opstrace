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

import React, { Reducer } from "react";
import PickerService from "../PickerService";
import { render, screen, fireEvent } from "../../../utils/testutils";
import ThemeProvider from "../../../themes/Provider";
import light from "../../../themes/light";
import { PickerState } from "../types";
import { actions } from "../reducer";

import '@testing-library/jest-dom'

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

test("select last option when the picker list is loop through", async () => {
  wrap(
    <PickerService>
      <div />
    </PickerService>
  );

  const providerTextInput = await screen.findByDisplayValue("provider-1");

  expect(providerTextInput).toBeInTheDocument();

  [
    "ArrowDown",
    "ArrowDown",
    "ArrowDown",
    "ArrowDown",
    "ArrowDown",
    "Enter"
  ].map(key => fireEvent.keyDown(providerTextInput, { key }));

  expect(selectFirstProviderOption).toHaveBeenCalledWith(
    {
      id: "option-3",
      text: "option 3"
    },
    ""
  );
});

test("change provider and select first option when the picker list is loop through ", async () => {
  wrap(
    <PickerService>
      <div />
    </PickerService>
  );

  const providerTextInput = await screen.findByLabelText("picker filter");
  expect(providerTextInput).toBeInTheDocument();

  fireEvent.change(providerTextInput, { target: { value: "provider-2" } });

  ["ArrowUp", "ArrowUp", "ArrowUp", "ArrowUp", "Enter"].map(key =>
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
