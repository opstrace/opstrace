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
