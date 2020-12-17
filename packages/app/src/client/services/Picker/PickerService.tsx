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

import React, { useEffect, useCallback, useMemo, useState } from "react";
import InputBase from "@material-ui/core/InputBase";
import List from "client/components/List/List";
import { ButtonListItem } from "client/components/List/ListItem";
import ListItemText from "client/components/List/ListItemText";
import ListItemSecondaryAction from "client/components/List/ListItemSecondaryAction";
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
import { Typography } from "client/components/Typography";

const boundedIndex = (value: number, max: number) => {
  if (value < 0) return max;
  if (value > max) return 0;

  return value;
};

const PICKER_WIDTH = 400;
const PICKER_HEIGHT = 500;

function PickerList(props: PickerListProps) {
  const { selectedIndex, onSelect, secondaryAction } = props;

  const renderItem = useCallback(
    ({ data, index }: { data: PickerOption; index: number }) => (
      <ButtonListItem
        selected={index === selectedIndex}
        onClick={() => onSelect(data)}
        key={data.id}
      >
        <ListItemText primary={data.text} />
        {secondaryAction && (
          <ListItemSecondaryAction>
            {secondaryAction(data)}
          </ListItemSecondaryAction>
        )}
      </ButtonListItem>
    ),
    [selectedIndex, onSelect, secondaryAction]
  );

  return (
    <Box width={PICKER_WIDTH} height={PICKER_HEIGHT}>
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

  const filterValue = state.text
    ?.replace(activePicker?.activationPrefix || "", "")
    .replace(/^\s+/, "");

  const hasValidationError = activePicker?.textValidator
    ? !activePicker?.textValidator.test(filterValue || "")
    : false;

  const onSelect = useCallback(
    (selected: PickerOption) => {
      close();
      if (activePicker && selected) {
        activePicker.onSelected(selected, filterValue);
      }
    },
    [activePicker, close, filterValue]
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

  const filteredOptions = activePicker?.disableFilter
    ? options
    : matchSorter(options, filterValue || "", {
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
          {activePicker?.title ? (
            <Box width="100%" pb={1}>
              <Typography color="textSecondary" variant="h6">
                {activePicker.title}
              </Typography>
            </Box>
          ) : null}
          <Box
            height={activePicker?.disableInput ? "0px" : "auto"}
            width="100%"
            overflow="hidden"
          >
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
                  if (!hasValidationError) {
                    onSelect(filteredOptions[selectedIndex]);
                  }
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
          </Box>
          <Divider />
        </Box>
        {hasValidationError ? (
          <Box width={PICKER_WIDTH} height={PICKER_HEIGHT} textAlign="center">
            <Typography variant="caption" color="textSecondary">
              {activePicker?.textValidationFailedMessage ||
                `Input must satisfy ${activePicker?.textValidator?.toString()}`}
            </Typography>
          </Box>
        ) : (
          <PickerList
            selectedIndex={selectedIndex}
            onSelect={onSelect}
            options={filteredOptions}
            secondaryAction={activePicker?.secondaryAction}
          />
        )}
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

  return useMemo(
    () => ({
      activatePickerWithText: picker.setText
    }),
    [picker.setText]
  );
}

export default React.memo(PickerService);
