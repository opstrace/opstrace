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

import React, { useRef } from "react";
import { Provider } from "react-redux";
import createMainStore from "./store";

// re-export these, but can also use directly from "react-redux"
export { useSelector, useDispatch } from "react-redux";
// re-export State type for convenience
export type { State } from "./reducer";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const store = useRef(createMainStore());

  return <Provider store={store.current}>{children}</Provider>;
}
