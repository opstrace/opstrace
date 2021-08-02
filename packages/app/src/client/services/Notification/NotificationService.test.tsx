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
import light from "client/themes/light";
import ThemeProvider from "client/themes/Provider";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { render } from "@testing-library/react";

test("useNotificationService", async () => {
  const title = "my-title";
  const information = "my-information";
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
      />
    );
  };

  const container = renderComponent(<TestComponent />);

  userEvent.click(container.getByRole("button"));

  expect(await container.findByText(title)).toBeInTheDocument();
  expect(await container.findByText(information)).toBeInTheDocument();
});

const renderComponent = (children: React.ReactNode) => {
  return render(
    <ThemeProvider theme={light}>
      <NotificationService>{children}</NotificationService>
    </ThemeProvider>
  );
};
