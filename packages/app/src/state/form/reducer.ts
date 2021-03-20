/**
 * Copyright 2021 Opstrace, Inc.
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

import { dissocPath, mergeDeepRight, hasPath, path } from "ramda";
import { mergePath } from "ramda-adjunct";

import { createReducer, ActionType } from "typesafe-actions";

import * as actions from "./actions";
import { expandFormId, newForm } from "state/form/utils";
import { FormRecords, Form } from "./types";

type FormActions = ActionType<typeof actions>;

type FormState = Record<string, FormRecords>;

const FormInitialState: FormState = {};

export const reducer = createReducer<FormState, FormActions>(FormInitialState)
  .handleAction(
    actions.registerForm,
    (state, action): FormState => {
      const { id, status, data } = action.payload;
      const { type, code } = expandFormId(id);
      if (hasPath([type, code])(state)) return state;
      else
        return mergePath(
          [type, code],
          newForm(type, code, status, data || {}),
          state
        ) as FormState;
    }
  )
  .handleAction(
    actions.unregisterForm,
    (state, action): FormState => {
      const { type, code } = expandFormId(action.payload);
      return dissocPath([type, code], state);
    }
  )
  .handleAction(
    actions.updateFormStatus,
    (state, action): FormState => {
      const { id, status } = action.payload;
      const { type, code } = expandFormId(id);
      if (hasPath([type, code])(state))
        return mergePath([type, code], { status }, state) as FormState;
      else return state;
    }
  )
  .handleAction(
    actions.updateForm,
    (state, action): FormState => {
      const { id, status, data, replaceData } = action.payload;
      const { type, code } = expandFormId(id);
      const form = path<Form>([type, code])(state);
      if (form) {
        if (replaceData === true) {
          return mergePath([type, code], { status, data }, state) as FormState;
          // return mergeDeepWithKey(
          //   (k, l, r) => (k === "data" || k === "status" ? r : l),
          //   state
          // )({
          //   [type]: { [code]: { status, data } }
          // });
        } else
          return mergeDeepRight(state)({
            [type]: {
              [code]: {
                status: status || form?.status,
                data: data
              }
            }
          });
      } else return state;
    }
  );
