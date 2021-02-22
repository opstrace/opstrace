/**
 * Copyright 2021 Opstrace, Inc.
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

import React, { useContext } from "react";
import { useForm } from "react-hook-form";

import { FormContext } from "./formContext";

import { AlertManagerBasicConfig } from "state/alertManagerConfig/types";

import { Typography, Grid, TextField, Button } from "@material-ui/core";
import { Box } from "client/components/Box";

const Form = () => {
  const { data, submitEvent } = useContext(FormContext);
  const { register, handleSubmit } = useForm({
    defaultValues: data,
    reValidateMode: "onBlur"
  });

  const onSubmit = (data: AlertManagerBasicConfig) => {
    submitEvent(data);
  };

  // const onChange = (data: AlertManagerBasicConfig) => {
  //   changeEvent(data);
  // };

  return (
    <Grid
      container
      direction="column"
      justify="center"
      alignItems="center"
      spacing={3}
    >
      <Grid item xs={12}>
        <Typography variant="h5" gutterBottom>
          Alert Manager Configuration
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Box display="flex" flexDirection="column" flexGrow={1}>
            <TextField
              inputRef={register}
              name="resolveTimeout"
              label="Resolve Timeout"
            />
            <TextField
              inputRef={register}
              name="slack.apiUrl"
              label="Slack API URL"
            />
            <TextField
              inputRef={register}
              name="slack.channel"
              label="Slack Channel"
            />
            {/*            <TextField
              inputRef={register}
              name="slack.title"
              label="Slack Title"
            />
            <TextField
              inputRef={register}
              name="slack.text"
              label="Slack Text"
            />*/}
            <Button variant="contained" color="primary" type="submit">
              Save
            </Button>
          </Box>
        </form>
      </Grid>
    </Grid>
  );
};

export default Form;
