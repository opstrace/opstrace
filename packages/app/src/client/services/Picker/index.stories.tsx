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

import React, { useCallback } from "react";
import { Meta } from "@storybook/react";

import { usePickerService } from "./PickerService";
import { PickerOption } from "./types";
import { Button } from "../../components/Button";
import Services from "../index";

export default {
  title: "Services/Picker"
} as Meta;

function IWantToUseAPicker() {
  const [options, setOptions] = React.useState([
    { id: "1", text: "option 1" },
    { id: "2", text: "option 2" }
  ]);

  const [
    selectedOption,
    setSelectedOption
  ] = React.useState<PickerOption | null>(null);

  const { activatePickerWithText } = usePickerService(
    {
      activationPrefix: ">",
      options,
      onSelected: option => {
        setSelectedOption(option);
      }
    },
    [options.length]
  );

  const addOption = useCallback(() => {
    const now = Date.now().toString();
    setOptions([...options, { id: now, text: now }]);
  }, [options]);

  // example of updating options in the background
  React.useEffect(() => {
    const id = setInterval(addOption, 2000);
    return () => clearInterval(id);
  }, [options.length, addOption]);

  return (
    <>
      <div>{`selected option text: ${selectedOption?.text} `}</div>
      <br />
      <Button
        variant="contained"
        state="primary"
        onClick={() => activatePickerWithText("> ")}
      >
        open picker
      </Button>
      <br />
      <br />
      <Button variant="contained" state="secondary" onClick={() => addOption()}>
        add option
      </Button>
    </>
  );
}

export const Default = (): JSX.Element => {
  return (
    <Services>
      <IWantToUseAPicker />
    </Services>
  );
};
