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
import AutoSizer, { Size } from "react-virtualized-auto-sizer";
import Box from "../Box/Box";
import Column from "./Column";

import Layout from "./Layout";
import Row from "./Row";

export default {
  title: "Components/Layout"
};

export const Default = (): JSX.Element => {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <AutoSizer>
        {({ height, width }: Size) => {
          return (
            <Box position="absolute" width="100%" height="100%">
              <Layout minHeight={height} width={width}>
                <Row>
                  <Column>
                    <Row>
                      <>default to column since child of row</>
                      <>default to column since child of row</>
                      <>default to column since child of row</>
                      <>default to column since child of row</>
                    </Row>
                    <>default to row since is child of column</>
                    <>default to row since is child of column</>
                    <>default to row since is child of column</>
                  </Column>
                </Row>
                <Row>
                  <>default to column since child of row</>
                  <Column>
                    <>default to row since is child of column</>
                    <>default to row since is child of column</>
                  </Column>
                </Row>
              </Layout>
            </Box>
          );
        }}
      </AutoSizer>
    </div>
  );
};

export const NestedRows = (): JSX.Element => {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <AutoSizer>
        {({ height, width }: Size) => {
          return (
            <Box position="absolute" width="100%" height="100%">
              <Layout minHeight={height} width={width}>
                <Row>
                  <Column>
                    <>default to row since is child of column</>
                    <>default to row since is child of column</>
                  </Column>
                  <>default to column since child of row</>
                  <>default to column since child of row</>
                </Row>
                <Row>
                  <>default to column since child of row</>
                  <>default to column since child of row</>
                  <>default to column since child of row</>
                  <>default to column since child of row</>
                </Row>
              </Layout>
            </Box>
          );
        }}
      </AutoSizer>
    </div>
  );
};

export const SimpleSideBySide = (): JSX.Element => {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <AutoSizer>
        {({ height, width }: Size) => {
          return (
            <Box position="absolute" width="100%" height="100%">
              <Layout minHeight={height} width={width}>
                <Row>
                  <>some content</>
                  <>some content</>
                </Row>
              </Layout>
            </Box>
          );
        }}
      </AutoSizer>
    </div>
  );
};

export const SinglePanel = (): JSX.Element => {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <AutoSizer>
        {({ height, width }: Size) => {
          return (
            <Box position="absolute" width="100%" height="100%">
              <Layout minHeight={height} width={width}>
                <>a single item</>
              </Layout>
            </Box>
          );
        }}
      </AutoSizer>
    </div>
  );
};
