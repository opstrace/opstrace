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
import { Meta } from "@storybook/react";

import Card from "./Card";
import CardActions from "./CardActions";
import CardContent from "./CardContent";
import CardHeader from "./CardHeader";
import { Button } from "../Button";
import { Typography } from "../Typography";
import WarningIcon from "@material-ui/icons/Warning";

export default {
  title: "Components/Card"
} as Meta;

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
