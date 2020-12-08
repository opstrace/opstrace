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
import { expectSaga } from "redux-saga-test-plan";
import * as matchers from "redux-saga-test-plan/matchers";
import { eventChannel } from "redux-saga";
import userListSubscriptionManager, {
  userListSubscriptionEventChannel,
  executeActionsChannel
} from "state/user/sagas/userListSubscription";
import * as actions from "state/user/actions";

describe("userListSubscriptionManager", () => {
  const mockChannel = eventChannel(() => () => {});

  test("should subscribe for new actions", async () => {
    const saga = userListSubscriptionManager();
    const forkedSubscribe = saga.next().value;
    const subscribeSaga = (forkedSubscribe as any).payload.fn;
    await expectSaga(subscribeSaga)
      .provide([
        // Mock part
        [matchers.call.fn(userListSubscriptionEventChannel), mockChannel]
      ])
      .take(actions.subscribeToUserList)
      .dispatch(actions.subscribeToUserList(1))
      .call(userListSubscriptionEventChannel)
      .fork(executeActionsChannel, mockChannel)
      //Should wait for subscribe actions again
      .take(actions.subscribeToUserList)
      .run();
  });

  test("should not subscribe for actions twice", async () => {
    const saga = userListSubscriptionManager();
    const forkedSubscribe = saga.next().value;
    const subscribeSaga = (forkedSubscribe as any).payload.fn;
    await expectSaga(subscribeSaga)
      .provide([
        // Mock part
        [
          matchers.call.fn(userListSubscriptionEventChannel),
          eventChannel(() => () => {})
        ]
      ])
      .take(actions.subscribeToUserList)
      .dispatch(actions.subscribeToUserList(1))
      .dispatch(actions.subscribeToUserList(2))
      .run()
      .then(({ effects }) => {
        expect(effects.call).toHaveLength(1);
      });
  });
});
