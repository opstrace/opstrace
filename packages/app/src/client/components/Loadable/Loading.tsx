import React from "react";

import { Spinner } from "../Spinner";
import Container from "./Container";

const LoadingView = () => {
  return (
    <Container>
      <Spinner size={30} center />
    </Container>
  );
};

export default LoadingView;
