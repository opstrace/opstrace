/**
 * Copyright 2019-2021 Opstrace, Inc.
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

import { Box } from "../Box";

const TreeViewSkeleton = () => {
  // don't want to flash, so only show after a delay
  const [show, setShow] = React.useState(false);
  React.useEffect(() => {
    // only show loading after 200ms
    const id = setTimeout(() => setShow(true), 200);

    return () => clearTimeout(id);
  }, []);

  if (!show) {
    return null;
  }

  return (
    <Box width="100%" height="200px">
      {Array(3)
        .fill(true)
        .map((_, idx) => (
          <Skeleton
            key={idx}
            variant="text"
            animation="wave"
            height={20}
            width="80%"
          />
        ))}
    </Box>
  );
};

export default TreeViewSkeleton;
