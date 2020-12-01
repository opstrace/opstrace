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
