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

import { useSelector, State } from "state/provider";

export const getOpstraceConfig = (state: State) => state.opstrace;

export default function useOpstraceConfig() {
  const opstraceConfig = useSelector(getOpstraceConfig);

  // todo: dispatch a call to load the config if it's not here.
  // it's static so don't need a subscription
  // const dispatch = useDispatch();

  // useEffect(() => {
  //   const subId = getSubscriptionID();
  //   dispatch(subscribeToCortexConfig(subId));
  //   return () => {
  //     dispatch(unsubscribeFromCortexConfig(subId));
  //   };
  // }, [dispatch]);

  return opstraceConfig;
}
