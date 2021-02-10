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

import { Reducer, useReducer, useMemo } from "react";
import { ActionType } from "typesafe-actions";

// Credit: https://realfiction.net/2019/03/12/using-typed-action-creators-with-reacts-usereducer-hook
export function useTypesafeReducer<
  StateShape,
  Actions extends { [key: string]: (...args: any[]) => any }
>(
  reducer: Reducer<StateShape, ActionType<Actions>>,
  initialState: StateShape,
  actions: Actions
): [StateShape, Actions] {
  const [state, dispatch] = useReducer(reducer, initialState);
  const boundActions = useMemo(() => {
    function bindActionCreator(
      actionCreator: (...args: any[]) => any,
      dispatcher: typeof dispatch
    ) {
      return function (this: any) {
        return dispatcher(
          actionCreator.apply(this as any, (arguments as unknown) as any[])
        );
      };
    }

    const newActions = Object.keys(actions).reduce((ba, actionName) => {
      ba[actionName] = bindActionCreator(actions[actionName], dispatch);
      return ba;
    }, {} as { [key: string]: (...args: any[]) => any });
    return newActions;
  }, [dispatch, actions]);
  return [state, boundActions as Actions];
}
