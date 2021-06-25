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

import React, { useState, useCallback } from "react";
import { Eye } from "react-feather";

import { makeStyles } from "@material-ui/core/styles";
import classNames from "classnames";
import axios from "axios";
import {
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography
} from "@material-ui/core";
import { Card } from "client/components/Card";
import { formatDistanceToNow } from "date-fns";
import SkeletonTableBody from "./SkeletonTableBody";
import { useNotificationService } from "client/services/Notification";
import { Button } from "client/components/Button";
import { Box } from "client/components/Box";
import TokenDialog from "./TokenDialog";
import { useRouteMatch, useHistory } from "react-router-dom";
import useInterval from "react-use/lib/useInterval";
import useMountedState from "react-use/lib/useMountedState";
import { usePickerService } from "client/services/Picker";

const useStyles = makeStyles(theme => ({
  shardWarning: {
    backgroundColor: theme.palette.warning.main
  }
}));

export type Shard = {
  id: string;
  state: string;
  timestamp: string;
  zone: string;
  address: string;
  // Can be empty when tokens have been forgotten and have not been reassigned, or when a new component starts and doesn't have tokens assigned yet
  tokens?: number[];
  registered_timestamp: string;
};

type Payload = {
  shards: Array<Shard>;
  now: string;
};

type Props = {
  ringEndpoint: string;
  baseUrl: string;
};

function getRandomInt() {
  return Math.floor(Math.random() * Math.floor(100000));
}

const RingTable = ({ ringEndpoint, baseUrl }: Props) => {
  const history = useHistory();

  const {
    registerNotification,
    unregisterNotification
  } = useNotificationService();
  const [keepPolling, setKeepPolling] = useState(true);
  const [shards, setShards] = useState<Array<Shard>>();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isMounted = useMountedState();

  const notifyError = useCallback(
    (title: string, message: string) => {
      const messageId = `${getRandomInt()}`;
      const newNotification = {
        id: messageId,
        state: "error" as const,
        title,
        information: message,
        handleClose: () =>
          unregisterNotification({
            id: messageId,
            title: "",
            information: ""
          })
      };
      registerNotification(newNotification);
    },
    [registerNotification, unregisterNotification]
  );

  const forgetShard = useCallback(
    async (shardId: Shard["id"]) => {
      try {
        const bodyFormData = new FormData();
        bodyFormData.append("forget", shardId);
        setIsRefreshing(true);
        const response = await axios.post<Payload>(ringEndpoint, bodyFormData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        setShards(response.data.shards);
        setIsRefreshing(false);
      } catch (e) {
        setIsRefreshing(false);
        notifyError(`Could not forget shard`, e.message);
      }
    },
    [ringEndpoint, notifyError]
  );

  const fetchShards = async () => {
    try {
      if (!isMounted()) {
        /* As we poll the shards every few seconds, we occassionaly
         * run into the situation that, in between request and response,
         * the component did unmount.
         *
         * To prevent errors and warnings like
         * "Can't perform a React state update on an unmounted component",
         * we check for the mounted state and cancel any further operation
         * if the component in fact did unmount.
         */
        return;
      }
      const response = await axios.get<Payload>(ringEndpoint);
      setShards(response.data.shards);
    } catch (e) {
      notifyError("Could not load table", e.response.data ?? e.message);
      setKeepPolling(false);
    }
  };

  useInterval(fetchShards, keepPolling ? 2000 : null);

  const tokenShardIdToDisplay = useRouteMatch<{ shardId: string }>(
    `${baseUrl}/:shardId/token`
  )?.params.shardId;
  const tokensToDisplay = shards?.find(s => s.id === tokenShardIdToDisplay)
    ?.tokens;

  return (
    <>
      <TokenDialog
        tokens={tokensToDisplay}
        onClose={() => history.push(baseUrl)}
      />
      <TableContainer component={Card}>
        <Table aria-label="tenants">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>State</TableCell>
              <TableCell>Last Heartbeat</TableCell>
              <TableCell>Zone</TableCell>
              <TableCell>Address</TableCell>
              <TableCell>Tokens</TableCell>
              <TableCell>
                <Typography variant="srOnly">Forget Shard</Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          {shards && !isRefreshing ? (
            <TableBody>
              {shards.map(shard => (
                <RingShard
                  key={shard.id}
                  shard={shard}
                  onForget={forgetShard}
                  baseUrl={baseUrl}
                />
              ))}
            </TableBody>
          ) : (
            <SkeletonTableBody numberColumns={7} numberRows={5} />
          )}
        </Table>
      </TableContainer>
    </>
  );
};

const RingShard = ({
  shard,
  onForget,
  baseUrl
}: {
  shard: Shard;
  onForget: (id: string) => void;
  baseUrl: string;
}) => {
  const history = useHistory();
  const { activatePickerWithText } = usePickerService(
    {
      title: `Forget ${shard.id}?`,
      activationPrefix: `forget shard ${shard.id} directly?:`,
      disableFilter: true,
      disableInput: true,
      options: [
        {
          id: "yes",
          text: `yes`
        },
        {
          id: "no",
          text: "no"
        }
      ],
      onSelected: option => {
        if (option.id === "yes" && shard.id) onForget(shard.id);
      }
    },
    [shard.id, onForget]
  );
  const classes = useStyles();

  return (
    <TableRow
      key={shard.id}
      className={classNames({
        [classes.shardWarning]: shard.state !== "ACTIVE"
      })}
    >
      <TableCell component="th" scope="row">
        {shard.id}
      </TableCell>
      <TableCell>{shard.state}</TableCell>
      <TableCell>
        {formatDistanceToNow(new Date(shard.timestamp), {
          addSuffix: true
        })}
      </TableCell>
      <TableCell>{shard.zone || "-"}</TableCell>
      <TableCell>{shard.address}</TableCell>
      <TableCell>
        <Button
          aria-label="show token dialog"
          onClick={() => {
            history.push(`${baseUrl}/${shard.id}/token`);
          }}
        >
          {shard.tokens ? shard.tokens.length : 0}
          <Box pl={1} />
          <Eye />
        </Button>
      </TableCell>
      <TableCell>
        <Button
          variant="text"
          state="error"
          onClick={() =>
            activatePickerWithText(`forget shard ${shard.id} directly?: `)
          }
        >
          Forget
        </Button>
      </TableCell>
    </TableRow>
  );
};

export default RingTable;
