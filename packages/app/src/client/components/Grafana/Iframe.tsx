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

import React, { useState, useEffect, useRef } from "react";
import { entries } from "lodash";
import { useTheme } from "@material-ui/core/styles";

import { Box } from "client/components/Box";

export type GrafanaIframeProps = {
  // e.g. /d/3e97d1d02672cdd0861f4c97c64f89b2/use-method-cluster
  path: string;
  initialHeight: number;
  params?: { [key: string]: string | number };
  tenant?: string;
  title?: string;
};

const GrafanaIframe = (props: GrafanaIframeProps) => {
  const theme = useTheme();
  const [height] = useState(props.initialHeight);
  const frame = useRef<HTMLIFrameElement | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(1);

  useEffect(() => {
    if (theme.palette.type && frame.current) {
      setReloadTrigger(reloadTrigger + 1);
    }
  }, [theme.palette.type]);

  let queryParams = {
    orgId: 1,
    refresh: "10s"
  };
  if (props.params) {
    // delete key if it exists so we can control how its added
    if (props.params.kiosk) {
      delete props.params.kiosk;
    }
    queryParams = { ...queryParams, ...props.params };
  }

  const queryString = entries(queryParams).reduce((query, [key, val]) => {
    return `${query}&${key}=${val}`;
  }, "kiosk");

  return (
    <Box
      border={`1px solid ${theme.palette.divider}`}
      borderRadius={theme.shape.borderRadius}
      overflow="hidden"
      width="100%"
    >
      <iframe
        key={`${reloadTrigger}`}
        ref={frame}
        width="100%"
        height={height}
        style={{ border: "none" }}
        title={props.title || "Opstrace"}
        src={`${window.location.protocol}//${props.tenant || "system"}.${
          window.location.host
        }/grafana${props.path}?${queryString}`}
      />
    </Box>
  );
};

export default GrafanaIframe;
