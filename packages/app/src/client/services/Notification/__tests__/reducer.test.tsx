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

import { notificationServiceReducer, initialState, actions } from "../reducer";

const notification1 = {
  id: "notification-1",
  title: "Notification 1",
  information: "Notification about error 1",
  state: "error"
};

const notification2 = {
  id: "notification-2",
  title: "Notification 2",
  information: "Notification information 2"
};

const mockState = {
  notifications: [notification1, notification2],
  visibility: false
};

test("return the initial state", () => {
  const reducer = notificationServiceReducer(undefined, {} as any);

  expect(reducer).toEqual(initialState);
});

describe("handle register action", () => {
  test("add new notification to notifications list", () => {
    const notification = {
      id: "new-notification",
      title: "New notification",
      information: "This is new notification"
    };

    const reducer = notificationServiceReducer(
      mockState,
      actions.register(notification)
    );

    expect(reducer.notifications.length).toEqual(3);
    expect(reducer.notifications[0]).toEqual(notification);
    expect(reducer.visibility).toBeTruthy();
  });

  test("don't add notification with existing id", () => {
    const reducer = notificationServiceReducer(
      mockState,
      actions.register(notification2)
    );

    expect(reducer.notifications.length).toEqual(2);
    expect(reducer.notifications[0]).toEqual(notification1);
    expect(reducer.notifications[1]).toEqual(notification2);
  });
});

describe("handle unregister action", () => {
  test("remove notification from notifications list", () => {
    const reducer = notificationServiceReducer(
      mockState,
      actions.unregister(notification2)
    );

    expect(reducer.notifications.length).toEqual(1);
    expect(reducer.notifications[0]).toEqual(notification1);
  });

  test("don't change notifications list when notification is unknown ", () => {
    const notification = {
      id: "new-notification",
      title: "New notification",
      information: "This is new notification"
    };
    const reducer = notificationServiceReducer(
      mockState,
      actions.unregister(notification)
    );

    expect(reducer.notifications.length).toEqual(2);
    expect(reducer.notifications[0]).toEqual(notification1);
    expect(reducer.notifications[1]).toEqual(notification2);
  });
});

test("remove all notifications", () => {
  const reducer = notificationServiceReducer(
    mockState,
    actions.unregisterAll()
  );

  expect(reducer.notifications.length).toEqual(0);
  expect(reducer).toEqual(initialState);
});

test("make notifications list visible", () => {
  const reducer = notificationServiceReducer(
    mockState,
    actions.changeVisibility()
  );

  expect(reducer.visibility).toBeTruthy();
});
