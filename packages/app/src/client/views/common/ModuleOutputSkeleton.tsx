import React from "react";
import Skeleton from "@material-ui/lab/Skeleton";

import { Row, Column } from "client/components/Layout";
import Layout from "client/components/Layout/Layout";

const ModuleOutputSkeleton = ({
  minHeight,
  width
}: {
  minHeight: number;
  width: number;
}) => {
  const GeneralSkeleton = () => (
    <Skeleton variant="rect" width="100%" height="100%" />
  );

  return (
    <Layout minHeight={minHeight} width={width}>
      <Row>
        <GeneralSkeleton />
        <GeneralSkeleton />
        <Column>
          <GeneralSkeleton />
          <GeneralSkeleton />
        </Column>
      </Row>
      <GeneralSkeleton />
      <GeneralSkeleton />
      <GeneralSkeleton />
    </Layout>
  );
};

export default ModuleOutputSkeleton;
