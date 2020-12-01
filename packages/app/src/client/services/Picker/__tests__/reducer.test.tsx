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

import { pickerReducer, initialState, actions } from "../reducer";

const mockState = {
  activeProviderIndex: 0,
  text: "provider-1",
  providers: [
    {
      activationPrefix: "provider-1",
      onSelected: () => null,
      options: [
        {
          id: "option-1",
          text: "option 1"
        }
      ]
    },
    {
      activationPrefix: "provider-2",
      onSelected: () => null,
      options: []
    }
  ]
};

test("return the initial state", () => {
  const reducer = pickerReducer(undefined, {} as any);

  expect(reducer).toEqual(initialState);
});

describe("handle register action", () => {
  test("add new provider", () => {
    const newProvider = {
      activationPrefix: "provider-new",
      onSelected: () => null,
      options: []
    };
    const reducer = pickerReducer(mockState, actions.register(newProvider));

    expect(reducer.providers.length).toEqual(3);
    expect(reducer.providers[0]).toEqual(newProvider);
  });

  test("update provider with current prefix", () => {
    const newProvider = {
      activationPrefix: "provider-1",
      onSelected: () => null,
      options: []
    };
    const reducer = pickerReducer(mockState, actions.register(newProvider));

    expect(reducer.providers.length).toEqual(2);
    expect(reducer.activeProviderIndex).toEqual(1);
    expect(reducer.providers[1]).toEqual(newProvider);
  });
});

describe("handle unregister action", () => {
  test("don't change state when provider is unknown", () => {
    const provider = {
      activationPrefix: "provider-new",
      onSelected: () => null,
      options: []
    };
    const reducer = pickerReducer(mockState, actions.unregister(provider));

    expect(reducer).toEqual(mockState);
  });

  test("remove provider from providers list and fix active index", () => {
    const provider = mockState.providers[mockState.activeProviderIndex];
    const reducer = pickerReducer(mockState, actions.unregister(provider));

    expect(reducer.activeProviderIndex).toEqual(-1);
    expect(reducer.providers.length).toEqual(1);
  });
});

test("handle close action", () => {
  const reducer = pickerReducer(mockState, actions.close());

  expect(reducer.text).toEqual(null);
  expect(reducer.activeProviderIndex).toEqual(-1);
});

describe("handle setText action", () => {
  test("set active index to -1 when text is wrong", () => {
    const reducer = pickerReducer(mockState, actions.setText("unknown"));

    expect(reducer.activeProviderIndex).toEqual(-1);
    expect(reducer.text).toEqual("unknown");
  });

  test("set correct active index when set real provider prefix", () => {
    const reducer = pickerReducer(
      mockState,
      actions.setText("provider-2-test")
    );

    expect(reducer.activeProviderIndex).toEqual(1);
    expect(reducer.text).toEqual("provider-2-test");
  });
});
