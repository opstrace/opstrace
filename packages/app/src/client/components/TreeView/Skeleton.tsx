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
