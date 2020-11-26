import React from "react";

import { usePickerService } from "./PickerService";
import { PickerOption } from "./types";
import { Button } from "../../components/Button";
import Services from "../index";

export default {
  title: "Services/Picker"
};

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

  const addOption = () => {
    const now = Date.now().toString();
    setOptions([...options, { id: now, text: now }]);
  };

  // example of updating options in the background
  React.useEffect(() => {
    const id = setInterval(addOption, 2000);
    return () => clearInterval(id);
  }, [options.length]);

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
