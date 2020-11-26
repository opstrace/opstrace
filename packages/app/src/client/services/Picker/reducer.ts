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

import { createReducer, ActionType, createAction } from "typesafe-actions";
import { PickerState, PickerProvider } from "./types";

export const actions = {
  register: createAction("REGISTER_PICKER_PROVIDER")<PickerProvider>(),
  unregister: createAction("UNREGISTER_PICKER_PROVIDER")<PickerProvider>(),
  close: createAction("CLOSE_PICKER_PROVIDER")(),
  setText: createAction("SET_TEXT_PICKER_PROVIDER")<string>()
};

type Actions = ActionType<typeof actions>;

function removeProvider(
  providers: PickerProvider[],
  provider: PickerProvider
): PickerProvider[] {
  return providers.filter(
    p => p.activationPrefix !== provider.activationPrefix
  );
}

function findActiveProviderIndex(
  text: string | null,
  providers: PickerProvider[]
): number {
  if (text === null) {
    return -1;
  }
  // sort providers by longest activationPrefix so we
  // naturally greedy match the longest prefix first
  return providers
    .sort((a, b) => b.activationPrefix.length - a.activationPrefix.length)
    .findIndex(provider =>
      text.replace(/^\s+/, "").startsWith(provider.activationPrefix)
    );
}

export const initialState: PickerState = {
  activeProviderIndex: -1,
  text: null,
  providers: []
};

export const pickerReducer = createReducer<PickerState, Actions>(initialState)
  .handleAction(
    actions.register,
    (state, action): PickerState => {
      const providers = removeProvider(state.providers, action.payload).concat(
        action.payload
      );
      const activeProviderIndex = findActiveProviderIndex(
        state.text,
        providers
      );
      return {
        ...state,
        providers,
        activeProviderIndex
      };
    }
  )
  .handleAction(
    actions.unregister,
    (state, action): PickerState => {
      const providers = removeProvider(state.providers, action.payload);
      const activeProviderIndex = findActiveProviderIndex(
        state.text,
        providers
      );
      return {
        ...state,
        providers,
        activeProviderIndex
      };
    }
  )
  .handleAction(
    actions.close,
    (state, _): PickerState => {
      return {
        ...state,
        activeProviderIndex: -1,
        text: null
      };
    }
  )
  .handleAction(
    actions.setText,
    (state, action): PickerState => {
      const activeProviderIndex = findActiveProviderIndex(
        action.payload,
        state.providers
      );
      return {
        ...state,
        text: action.payload,
        activeProviderIndex
      };
    }
  );
