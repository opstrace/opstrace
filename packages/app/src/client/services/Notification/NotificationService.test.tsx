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

import React from "react";
import {
  useSimpleNotification,
  NotificationService
} from "client/services/Notification";
import userEvent from "@testing-library/user-event";
import { renderWithEnv, screen, act, within } from "client/utils/testutils";

test("useNotificationService", async () => {
  const buttonName = "click me!";
  const title = "my title";
  const information = "my information";
  const state = "error";
  const TestComponent = () => {
    const { registerNotification } = useSimpleNotification();
    return (
      <button
        onClick={() =>
          registerNotification({
            title,
            information,
            state
          })
        }
      >
        {buttonName}
      </button>
    );
  };

  renderComponent(<TestComponent />);
  act(() => {
    userEvent.click(screen.getByRole("button", { name: buttonName }));
  });

  const alert = within((await screen.findAllByRole("alert"))[0]);
  expect(await alert.findByText(title)).toBeInTheDocument();
  expect(await alert.findByText(information)).toBeInTheDocument();
});

const renderComponent = (children: React.ReactNode) => {
  return renderWithEnv(<NotificationService>{children}</NotificationService>);
};
