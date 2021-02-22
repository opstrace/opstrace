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

import { usePickerService } from "client/services/Picker";
import { useCommandService } from "client/services/Command";
import { setSlackApiUrl } from "state/alertManagerConfig/actions";
import { useDispatch } from "react-redux";

const SetSlackApiUrlPicker = () => {
  const dispatch = useDispatch();

  const { activatePickerWithText } = usePickerService(
    {
      title: "Enter slack alerts",
      activationPrefix: "add slack api url: ",
      disableFilter: true,
      options: [
        {
          id: "save",
          text: `save`
        },
        {
          id: "cancel",
          text: "cancel"
        }
      ],
      onSelected: (option, url) => {
        if (option.id === "save" && url) {
          dispatch(setSlackApiUrl(url));
        }
      }
    },
    []
  );

  useCommandService({
    id: "set-slack-api-url-picker",
    description: "Set slack api url",
    handler: e => {
      e.keyboardEvent?.preventDefault();
      activatePickerWithText("add slack api url: ");
    }
  });

  return null;
};

export default React.memo(SetSlackApiUrlPicker);
