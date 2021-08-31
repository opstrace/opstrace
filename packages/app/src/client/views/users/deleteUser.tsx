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

import React from "react";
import useCurrentUser from "state/user/hooks/useCurrentUser";

import { Button } from "client/components/Button";
import { User } from "state/user/types";
import useUserConfirmDeletionPicker from "./useUserConfirmDeletionPicker";

const DeleteUserButton = ({ user }: { user: User }) => {
  const currentUser = useCurrentUser();

  const { activatePickerWithText } = useUserConfirmDeletionPicker(user);

  return (
    <Button
      variant="outlined"
      state="error"
      size="small"
      disabled={currentUser.email === user.email}
      onClick={e => {
        e.stopPropagation();
        activatePickerWithText(`delete user?: `);
      }}
    >
      Delete
    </Button>
  );
};

export default DeleteUserButton;
