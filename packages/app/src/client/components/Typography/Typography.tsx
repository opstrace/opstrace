import React from "react";
import styled from "styled-components";
import MuiTypography, { TypographyProps } from "@material-ui/core/Typography";

const BaseTypography = (props: TypographyProps) => <MuiTypography {...props} />;

const Typography = styled(BaseTypography)``;

export default Typography;
