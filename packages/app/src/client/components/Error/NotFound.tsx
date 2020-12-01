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

import { Box } from "../Box";
import { Button } from "../Button";
import { Typography } from "../Typography";
import { ErrorView } from "../Error";
import { CardActions } from "../Card";
import { Emoji } from "../Emoji";
import { useHistory } from "react-router-dom";

export type NotFoundProps = {
  title?: string;
  subheader?: string;
  content?: React.ReactNode;
};

const NotFound = ({ title, subheader, content }: NotFoundProps) => {
  const history = useHistory();
  return (
    <ErrorView
      title={title ? title : "That's a 404"}
      subheader={subheader ? subheader : ""}
      emoji="😬"
      maxWidth={400}
      actions={
        <CardActions>
          <Box display="flex" justifyContent="center" width="100%">
            <Box mr={1}>
              <Button
                variant="contained"
                state="primary"
                onClick={() => history.goBack()}
              >
                Go Back
              </Button>
            </Box>
            <Box>
              <Button
                variant="outlined"
                state="info"
                onClick={() => history.push("/")}
              >
                Go Home
              </Button>
            </Box>
          </Box>
        </CardActions>
      }
    >
      {content ? (
        content
      ) : (
        <Typography>
          We've missed the <Emoji ariaLabel="target" emoji="🎯" />
        </Typography>
      )}
    </ErrorView>
  );
};

export default NotFound;
