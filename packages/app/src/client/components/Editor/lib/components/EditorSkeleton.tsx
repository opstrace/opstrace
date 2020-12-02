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

import { Box } from "../../../Box";

function getRandomInt(max: number) {
  return Math.floor(Math.random() * Math.floor(max));
}

const EditorSkeleton = () => {
  return (
    <Box position="absolute" left={30} right={20} bottom={0} top={10}>
      {Array(30)
        .fill(true)
        .map((_, idx) => (
          <Skeleton
            key={idx}
            variant="text"
            animation="wave"
            height={20}
            width={`${getRandomInt(70) + 20}%`}
          />
        ))}
    </Box>
  );
};

export default EditorSkeleton;
