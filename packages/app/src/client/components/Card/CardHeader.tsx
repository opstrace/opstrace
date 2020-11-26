import React from "react";
import styled from "styled-components";

import MuiCardHeader, { CardHeaderProps } from "@material-ui/core/CardHeader";

const BaseCardHeader = (props: CardHeaderProps) => <MuiCardHeader {...props} />;

const CardHeader = styled(BaseCardHeader)``;

export default CardHeader;
