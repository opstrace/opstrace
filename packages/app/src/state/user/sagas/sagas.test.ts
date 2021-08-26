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

import { setupServer } from "msw/node";
import { graphql } from "msw";
import { deleteUserListener } from ".";
import * as actions from "../actions";
import { User } from "state/graphql-api-types";
import { expectSaga } from "redux-saga-test-plan";
import { actions as notificationActions } from "client/services/Notification/reducer";
import uniqueId from "lodash/uniqueId";

jest.mock("lodash/uniqueId");

const mockServer = setupServer();

const mockDeactivateUser = (id: User["id"]) => {
  const request = jest.fn();
  mockServer.use(
    graphql.mutation("DeactivateUser", (req, res, ctx) => {
      request(req.body!.variables);
      return res(
        ctx.data({
          update_user_by_pk: {
            id: id,
            active: false
          }
        })
      );
    })
  );
  return request;
};

beforeAll(() => mockServer.listen());

beforeEach(() => {
  mockServer.resetHandlers();
});

afterAll(() => mockServer.close());

describe("deleteUser", () => {
  test("sends request", async () => {
    const userId = "some-id";
    const request = mockDeactivateUser(userId);

    await expectSaga(deleteUserListener)
      .dispatch(actions.deleteUser(userId))
      .run();

    expect(request).toHaveBeenCalledWith({ id: userId });
  });

  test("handles graphql errors", async () => {
    const notificationId = "some-id";
    // @ts-expect-error
    uniqueId.mockImplementation(() => notificationId);
    const errorMessage = "some terrible error";

    mockServer.use(
      graphql.mutation("DeactivateUser", (req, res, ctx) => {
        return res(
          ctx.errors([
            {
              message: errorMessage
            }
          ])
        );
      })
    );

    await expectSaga(deleteUserListener)
      .dispatch(actions.deleteUser("some-user-id"))
      .put(
        notificationActions.register({
          id: notificationId,
          state: "error" as const,
          title: "Could not delete user",
          information: errorMessage
        })
      )
      .run();
  });

  test("handles generic errors", async () => {
    const notificationId = "some-id";
    // @ts-expect-error
    uniqueId.mockImplementation(() => notificationId);

    mockServer.use(
      graphql.mutation("DeactivateUser", (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    await expectSaga(deleteUserListener)
      .dispatch(actions.deleteUser("some-user-id"))
      .put(
        notificationActions.register({
          id: notificationId,
          state: "error" as const,
          title: "Could not delete user",
          information: "GraphQL Error (Code: 500)"
        })
      )
      .run();
  });
});
