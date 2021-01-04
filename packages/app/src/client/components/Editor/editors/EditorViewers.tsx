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

import React, { useCallback, useEffect, useState } from "react";
import Badge from "@material-ui/core/Badge";
import EditIcon from "@material-ui/icons/Edit";
import Avatar from "@material-ui/core/Avatar";
import CheckIcon from "@material-ui/icons/Check";
import AvatarGroup from "@material-ui/lab/AvatarGroup";
import { useFocusedOpenFile } from "state/file/hooks/useFiles";
import useUserList from "state/user/hooks/useUserList";
import { Viewer } from "state/file/types";
import useCurrentUser from "state/user/hooks/useCurrentUser";
import { User } from "state/user/types";
import { Box } from "client/components/Box";
import styled from "styled-components";
import { Button } from "client/components/Button";
import { claimEditor } from "state/clients/websocket/actions";
import socket from "state/clients/websocket";
import { useCommandService } from "client/services/Command";

function rgb(arr: number[]) {
  return `rgb(${arr[0]}, ${arr[1]}, ${arr[2]})`;
}

const StyledAvatarGroup = styled(AvatarGroup)`
  .MuiAvatarGroup-avatar {
    border: none;
  }
`;

const ColoredAvatar = styled(Avatar)<{ color: string }>`
  background-color: ${props => props.color};
  border: 2px solid ${props => props.color} !important;
`;

const EditingIcon = styled(Avatar)<{ color: string }>`
  background-color: ${props => props.color};
  border: 2px solid ${props => props.color};
  width: 22px;
  height: 22px;
  margin-right: -10px;
  margin-top: -10px;
`;

function EditorViewers() {
  const allUsers = useUserList();
  const currentUser = useCurrentUser();
  const focussedFile = useFocusedOpenFile();
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [users, setUsers] = useState<
    { user: User; color: number[]; isEditor: boolean }[]
  >([]);

  useEffect(() => {
    const userList = [];
    const viewerList = focussedFile?.viewers || [];

    for (const viewer of viewerList) {
      const user = allUsers.find(user => viewer.email === user.email);
      if (user) {
        userList.push({ user, isEditor: viewer.isEditor, color: viewer.color });
      }
    }
    setUsers(userList);
  }, [viewers, allUsers, currentUser?.email, focussedFile?.viewers]);

  useEffect(() => {
    if (!focussedFile) {
      return;
    }
    const dispose = focussedFile?.onViewersChange(() => {
      setViewers(focussedFile.viewers);
    });
    // Set initial viewers
    setViewers(focussedFile.viewers);

    return () => {
      dispose();
    };
  }, [focussedFile, focussedFile?.viewers]);

  const claimEditing = useCallback(() => {
    if (focussedFile) {
      socket.emit(claimEditor(focussedFile.file.id));
    }
  }, [focussedFile]);

  const isEditor = users.find(u => u.user.email === currentUser?.email)
    ?.isEditor;

  useCommandService(
    {
      id: "claim-editor",
      description: "Claim Editor",
      disabled: isEditor,
      handler: e => {
        e.keyboardEvent?.preventDefault();
        claimEditing();
      }
    },
    [claimEditing, isEditor]
  );

  const getAvatar = ({ user, color }: { user: User; color: string }) =>
    user.avatar ? (
      <ColoredAvatar
        color={color}
        key={`viewer:${user.opaque_id}`}
        alt={user.username}
        src={user.avatar}
      />
    ) : (
      <ColoredAvatar
        color={color}
        key={`viewer:${user.opaque_id}`}
        alt={user.username}
      >
        {user.username.slice(0, 1).toUpperCase()}
      </ColoredAvatar>
    );

  return focussedFile?.live && users.length ? (
    <Box
      height={50}
      display="flex"
      justifyContent="space-between"
      paddingRight={1}
    >
      <Box padding={1}>
        {isEditor ? (
          <Button
            variant="outlined"
            state="info"
            size="small"
            disabled
            endIcon={<CheckIcon />}
          >
            Editor
          </Button>
        ) : (
          <Button
            size="small"
            variant="outlined"
            state="info"
            endIcon={<EditIcon />}
            onClick={() => {
              claimEditing();
            }}
          >
            Claim Editor
          </Button>
        )}
      </Box>
      <StyledAvatarGroup max={10}>
        {users.map(viewer => {
          const { user, isEditor, color } = viewer;
          return isEditor ? (
            <Badge
              key={`editing:${user.opaque_id}`}
              overlap="circle"
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "left"
              }}
              badgeContent={
                <EditingIcon
                  color={rgb(color)}
                  alt="editing"
                  style={{ fontSize: 14, color: "white" }}
                >
                  <EditIcon fontSize="inherit" color="inherit" />
                </EditingIcon>
              }
            >
              {getAvatar({ user, color: rgb(color) })}
            </Badge>
          ) : (
            getAvatar({ user, color: rgb(color) })
          );
        })}
      </StyledAvatarGroup>
    </Box>
  ) : null;
}

export default React.memo(EditorViewers);
