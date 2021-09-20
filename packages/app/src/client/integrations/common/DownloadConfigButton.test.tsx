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
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import DownloadConfigButton from "./DownloadConfigButton";
import { saveAs } from "file-saver";
import { renderWithEnv } from "client/utils/testutils";

jest.mock("file-saver");

test("handles click", async () => {
  const config = "my-config";
  const filename = "my-filename";
  const label = "Download YAML";

  renderWithEnv(
    <DownloadConfigButton
      config={config}
      filename={filename}
      children={label}
    />
  );

  userEvent.click(screen.getByRole("button", { name: label }));

  // Just testing for filename, as it's not trivial to compare
  // blob contents at this moment, see
  // https://github.com/jsdom/jsdom/issues/2555
  expect(saveAs).toHaveBeenCalledWith(new Blob(), filename);
});

test("handles errors", async () => {
  const label = "Download YAML";
  const errorMessage = "something went terribly wrong";

  renderWithEnv(
    <DownloadConfigButton
      config="my-config"
      filename="my-filename"
      children={label}
    />
  );

  // @ts-expect-error mock
  saveAs.mockImplementation(() => {
    throw new Error(errorMessage);
  });

  userEvent.click(screen.getByRole("button", { name: label }));

  expect(screen.getByText("Could not download YAML")).toBeInTheDocument();
  expect(screen.getByText(errorMessage)).toBeInTheDocument();
});
