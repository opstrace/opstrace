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
import { expectSaga, testSaga } from "redux-saga-test-plan";
import * as matchers from "redux-saga-test-plan/matchers";
import { eventChannel, Task } from "redux-saga";
import { createMockTask } from "@redux-saga/testing-utils";
import moduleVersionsSubscriptionManager, {
  moduleSubscriptionEventChannel,
  executeActionsChannel
} from "state/moduleVersion/sagas/subscription";
import * as actions from "state/moduleVersion/actions";

describe("moduleVersionsSubscriptionManager", () => {
  const mockChannel = eventChannel(() => () => {});

  const mockTask: Task = createMockTask();

  test("should subscribe for new actions", async () => {
    const saga = moduleVersionsSubscriptionManager();
    const forkedSubscribe = saga.next().value;
    const subscribeSaga = (forkedSubscribe as any).payload.fn;
    await expectSaga(subscribeSaga)
      .provide([
        // Mock part
        [matchers.call.fn(moduleSubscriptionEventChannel), mockChannel]
      ])
      .take(actions.subscribe)
      .dispatch(actions.subscribe(1))
      .call(moduleSubscriptionEventChannel)
      .fork(executeActionsChannel, mockChannel)
      //Should wait for subscribe actions again
      .take(actions.subscribe)
      .run();
  });

  test("should subscribe for action again after cancel", async () => {
    const saga = moduleVersionsSubscriptionManager();
    const forkedSubscribe = saga.next().value;
    const subscribeSaga = (forkedSubscribe as any).payload.fn;
    const forkedUnsubscribe = saga.next().value;
    const unSubscribeSaga = (forkedUnsubscribe as any).payload.fn;
    await expectSaga(subscribeSaga)
      .provide([
        // Mock part
        [matchers.call.fn(moduleSubscriptionEventChannel), mockChannel]
      ])
      .dispatch(actions.subscribe(1))
      .run();
    await expectSaga(unSubscribeSaga).dispatch(actions.unsubscribe(1)).run();
    await expectSaga(subscribeSaga)
      .provide([
        // Mock part
        [matchers.call.fn(moduleSubscriptionEventChannel), mockChannel]
      ])
      .dispatch(actions.subscribe(1))
      .call(moduleSubscriptionEventChannel)
      .fork(executeActionsChannel, mockChannel)
      .run();
  });

  test("should not subscribe for actions twice", async () => {
    const saga = moduleVersionsSubscriptionManager();
    const forkedSubscribe = saga.next().value;
    const subscribeSaga = (forkedSubscribe as any).payload.fn;
    await expectSaga(subscribeSaga)
      .provide([
        // Mock part
        [
          matchers.call.fn(moduleSubscriptionEventChannel),
          eventChannel(() => () => {})
        ]
      ])
      .take(actions.subscribe)
      .dispatch(actions.subscribe(1))
      .dispatch(actions.subscribe(2))
      .run()
      .then(({ effects }) => {
        expect(effects.call).toHaveLength(1);
      });
  });

  test("should not cancel any subscription if they are empty yet", async () => {
    const saga = moduleVersionsSubscriptionManager();
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    saga.next().value;
    const forkedUnsubscribe = saga.next().value;
    const unSubscribeSaga = (forkedUnsubscribe as any).payload.fn;
    await testSaga(unSubscribeSaga)
      .next()
      .take(actions.unsubscribe)
      .next(actions.unsubscribe(1))
      .take(actions.unsubscribe);
  });

  test("should unsubscribe existent subscription", async () => {
    const saga = moduleVersionsSubscriptionManager();
    const forkedSubscribe = saga.next().value;
    const subscribeSaga = (forkedSubscribe as any).payload.fn;
    await expectSaga(subscribeSaga)
      .provide([
        // Mock part
        [matchers.call.fn(moduleSubscriptionEventChannel), mockChannel],
        [matchers.fork.fn(executeActionsChannel), mockTask]
      ])
      .dispatch(actions.subscribe(1))
      .run();
    const forkedUnsubscribe = saga.next().value;
    const unSubscribeSaga = (forkedUnsubscribe as any).payload.fn;
    // It should cancel tasks
    await testSaga(unSubscribeSaga)
      .next()
      .take(actions.unsubscribe)
      .next(actions.unsubscribe(1))
      .cancel(mockTask)
      .next()
      .take(actions.unsubscribe);
    // It should not cancel same subscription again
    await testSaga(unSubscribeSaga)
      .next()
      .take(actions.unsubscribe)
      .next(actions.unsubscribe(1))
      .take(actions.unsubscribe);
    // It should not cancel same subscription again
    await testSaga(unSubscribeSaga)
      .next()
      .take(actions.unsubscribe)
      .next(actions.unsubscribe(1))
      .take(actions.unsubscribe);
  });
});
