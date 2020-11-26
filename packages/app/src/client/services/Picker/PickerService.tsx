import React, { useEffect, useCallback, useMemo, useState } from "react";
import InputBase from "@material-ui/core/InputBase";
import List from "client/components/List/List";
import { ButtonListItem } from "client/components/List/ListItem";
import ListItemText from "client/components/List/ListItemText";
import Dialog from "client/components/Dialog/Dialog";
import Box from "client/components/Box/Box";

import type {
  PickerOption,
  PickerListProps,
  PickerProvider,
  PickerApi,
  PickerState
} from "./types";
import { useTypesafeReducer } from "../../hooks/useTypesafeReducer";
import { actions, pickerReducer, initialState } from "./reducer";
import Divider from "@material-ui/core/Divider";
import matchSorter from "match-sorter";

const boundedIndex = (value: number, max: number) => {
  if (value < 0) return 0;
  if (value > max) return max;

  return value;
};

function PickerList(props: PickerListProps) {
  const { selectedIndex, onSelect } = props;

  const renderItem = useCallback(
    ({ data, index }: { data: PickerOption; index: number }) => (
      <ButtonListItem
        selected={index === selectedIndex}
        onClick={() => onSelect(data)}
        key={data.id}
      >
        <ListItemText primary={data.text} />
      </ButtonListItem>
    ),
    [selectedIndex, onSelect]
  );

  return (
    <Box width={300} height={500}>
      <List renderItem={renderItem} items={props.options} itemSize={() => 30} />
    </Box>
  );
}

class PickerProviderChildren extends React.PureComponent {
  render() {
    return this.props.children;
  }
}

const pickerContext = React.createContext<PickerApi | null>(null);

function getActiveProvider(
  activeProviderIndex: number,
  providers: PickerProvider[]
) {
  return activeProviderIndex > -1 ? providers[activeProviderIndex] : null;
}

function PickerService({ children }: { children: React.ReactNode }) {
  const [state, { register, unregister, close, setText }] = useTypesafeReducer<
    PickerState,
    typeof actions
  >(pickerReducer, initialState, actions);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = React.useRef<HTMLInputElement | undefined>();

  const activePicker = getActiveProvider(
    state.activeProviderIndex,
    state.providers
  );

  const onSelect = useCallback(
    (selected: PickerOption) => {
      close();
      if (activePicker && selected) {
        activePicker.onSelected(selected);
      }
    },
    [activePicker, close]
  );

  const options = useMemo((): PickerOption[] => {
    if (!activePicker) {
      return [];
    }
    return activePicker.options;
  }, [activePicker]);

  const picker: PickerApi = {
    register,
    unregister,
    setText
  };

  useEffect(() => {
    // reset selectedIndex
    setSelectedIndex(0);
  }, [activePicker?.activationPrefix]);

  const filterValue = state.text
    ?.replace(activePicker?.activationPrefix || "", "")
    .replace(/^\s+/, "");

  const filteredOptions = matchSorter(options, filterValue || "", {
    keys: ["text"]
  });

  return (
    <>
      <pickerContext.Provider value={picker}>
        <PickerProviderChildren>{children}</PickerProviderChildren>
      </pickerContext.Provider>
      <Dialog
        data-testid="dialog"
        open={state.activeProviderIndex > -1}
        onClose={close}
        maxWidth="md"
      >
        <Box pr={2} pl={2} pt={1} pb={1}>
          <InputBase
            inputRef={inputRef}
            onKeyDown={e => {
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex(
                  boundedIndex(selectedIndex - 1, filteredOptions.length - 1)
                );
              }
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex(
                  boundedIndex(selectedIndex + 1, filteredOptions.length - 1)
                );
              }
              if (e.key === "Enter") {
                onSelect(filteredOptions[selectedIndex]);
              }
            }}
            onBlur={() => {
              // don't let us remove focus unless we're closing it
              inputRef.current?.focus();
            }}
            fullWidth
            autoFocus
            value={state.text || ""}
            inputProps={{ "aria-label": "picker filter" }}
            onChange={e => {
              setText(e.target.value);
            }}
          />
          <Divider />
        </Box>
        <PickerList
          selectedIndex={selectedIndex}
          onSelect={onSelect}
          options={filteredOptions}
        />
      </Dialog>
    </>
  );
}

export function usePickerService(
  provider?: PickerProvider,
  dependencies?: any[]
) {
  const picker = React.useContext(pickerContext);
  if (!picker) {
    throw new Error("usePickerService must be used within a PickerService.");
  }

  useEffect(() => {
    if (provider) {
      picker.register(provider);
    }
    // automatically unregister when unmounted
    return () => {
      if (provider) {
        picker.unregister(provider);
      }
    };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, dependencies || []);

  if (!provider) {
    return {
      activatePickerWithText: picker.setText
    };
  }
  return {
    activatePickerWithText: picker.setText
  };
}

export default React.memo(PickerService);
