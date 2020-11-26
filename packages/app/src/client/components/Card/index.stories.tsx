import React from "react";

import Card from "./Card";
import CardActions from "./CardActions";
import CardContent from "./CardContent";
import CardHeader from "./CardHeader";
import { Button } from "../Button";
import { Typography } from "../Typography";
import WarningIcon from "@material-ui/icons/Warning";

export default {
  title: "Components/Card"
};

export const Default = (): JSX.Element => {
  return (
    <Card variant="outlined">
      <CardHeader avatar={<WarningIcon color="primary" />} />
      <CardContent>
        <Typography color="textSecondary" gutterBottom>
          Some sort of heading
        </Typography>
        <Typography variant="h5">whatever</Typography>
        <Typography color="textSecondary">blah blah</Typography>
        <Typography variant="body2">
          well meaning and kindly.
          <br />
          {'"a benevolent smile"'}
        </Typography>
      </CardContent>
      <CardActions>
        <Button variant="outlined" state="warning">
          Warning
        </Button>
      </CardActions>
    </Card>
  );
};
