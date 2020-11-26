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
