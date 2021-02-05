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

import React, { useCallback, useEffect, useRef, useMemo } from "react";
import AutoSizer, { Size } from "react-virtualized-auto-sizer";
import { isActionOf } from "typesafe-actions";

import socket, { WebsocketEvents } from "state/clients/websocket";
import * as socketActions from "state/clients/websocket/actions";
import { Box } from "client/components/Box";
import buildTime from "client/buildInfo";
import { useDispatch } from "react-redux";
import * as actions from "state/sandbox/actions";
import { useFocusedOpenFile } from "state/file/hooks/useFiles";
import { getFileUri } from "state/file/utils/uri";

const AutoSizingSandbox = () => (
  <AutoSizer>{({ height }: Size) => <Sandbox height={height} />}</AutoSizer>
);

const Sandbox = React.memo((props: { height: number }) => {
  const dispatch = useDispatch();
  const openFile = useFocusedOpenFile();
  const sandboxRef = useRef<null | React.ElementRef<"iframe">>(null);

  const uri = openFile
    ? `${window.location.protocol}//${
        window.location.host
      }/modules/${getFileUri(openFile.file, {
        branch: openFile.file.branch_name
      })}.js`
    : "";

  const onSandboxMount = useCallback(
    async node => {
      if (node) {
        sandboxRef.current = node;
        node.style.height = `${props.height}px`;
      }
      if (node && uri) {
        dispatch(actions.initSandbox({ uri, client: node.contentWindow }));
      }
      if (!node) {
        dispatch(actions.disposeSandbox({}));
      }
    },
    [uri, dispatch, props.height]
  );

  useEffect(() => {
    if (sandboxRef.current) {
      sandboxRef.current.style.height = `${props.height}px`;
    }
  }, [props.height]);

  useEffect(() => {
    const onMessage = (action: WebsocketEvents) => {
      if (
        isActionOf(socketActions.compilerUpdated, action) &&
        action.payload.fileId === openFile?.file.id
      ) {
        // Inform the sandbox it needs to load the new code
        dispatch(actions.hmrSandboxUpdate({}));
      }
    };
    socket.listen(onMessage);

    return () => {
      socket.unlisten(onMessage);
    };
  }, [openFile, dispatch]);

  return useMemo(
    () => (
      <Box position="absolute" width="100%" height="100%">
        <Box
          p={0}
          justifyContent="left"
          alignItems="normal"
          data-testid="module-output"
        >
          <iframe
            ref={onSandboxMount}
            width="100%"
            height="100%"
            style={{ border: "none" }}
            title="Opstrace Module Sandbox"
            sandbox="allow-scripts" // Only allow scripts to run.
            srcDoc={`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Opstrace Module Sandbox</title>
              </head>
              <body>
                <div id="root"></div>
                <script type="module">
                  import("${window.location.protocol}//${window.location.host}/modules/x/sdk@latest/_runtime.js?mtime=${buildTime}");
                </script>
              </body>
            </html>
          `}
          />
        </Box>
      </Box>
    ),
    [onSandboxMount]
  );
});

export default AutoSizingSandbox;
