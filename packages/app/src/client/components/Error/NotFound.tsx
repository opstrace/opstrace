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
