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

import React, { useState } from "react";
import { Eye } from "react-feather";

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
import useInterval from "@use-it/interval";

type Shard = {
  id: string;
  state: string;
  timestamp: string;
  zone: string;
  address: string;
  tokens: number[];
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
  const [shards, setShards] = useState<Array<Shard>>();
  const [isRefreshing, setIsRefreshing] = useState(false);

  function notifyError(error: Error, message: string) {
    const messageId = `${getRandomInt()}`;
    const newNotification = {
      id: messageId,
      state: "error" as const,
      title: message,
      information: error.message,
      handleClose: () =>
        unregisterNotification({
          id: messageId,
          title: "",
          information: ""
        })
    };
    registerNotification(newNotification);
  }

  const forgetShard = async (shardId: Shard["id"]) => {
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
      notifyError(e, `Could not forget shard`);
    }
  };

  const fetchShards = async () => {
    try {
      const response = await axios.get<Payload>(ringEndpoint);
      setShards(response.data.shards);
    } catch (e) {
      notifyError(e, `Could not load table`);
    }
  };

  useInterval(fetchShards, 2000);

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
                <TableRow key={shard.id}>
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
                      {shard.tokens.length}
                      <Box pl={1} />
                      <Eye />
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="text"
                      state="error"
                      onClick={() => forgetShard(shard.id)}
                    >
                      Forget
                    </Button>
                  </TableCell>
                </TableRow>
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

export default RingTable;
