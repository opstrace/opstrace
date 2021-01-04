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
import { createStore as createReduxStore, applyMiddleware } from "redux";
import createSagaMiddleware from "redux-saga";
import { composeWithDevTools } from "redux-devtools-extension";

import { mainReducer } from "./reducer";
import mainSaga from "./sagas";

let _store: ReturnType<typeof createMainStore>;

export default function getStore() {
  if (!_store) {
    _store = createMainStore();
  }
  return _store;
}

function createMainStore() {
  const sagaMiddleware = createSagaMiddleware();
  const middlewares = [sagaMiddleware];

  const middlewareEnhancer = applyMiddleware(...middlewares);
  const enhancers = [middlewareEnhancer];

  // mount it on the Store
  const store = createReduxStore(
    mainReducer,
    process.env.NODE_ENV === "development"
      ? composeWithDevTools(...enhancers)
      : middlewareEnhancer
  );

  sagaMiddleware.run(mainSaga);

  return store;
}
