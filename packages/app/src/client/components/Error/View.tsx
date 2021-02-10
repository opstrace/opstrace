/**
 * Copyright 2019-2021 Opstrace, Inc.
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

import * as React from "react";
import newGithubIssueUrl from "new-github-issue-url";

import { Card, CardContent, CardHeader, CardActions } from "../Card";
import { Button } from "../Button";
import { Typography } from "../Typography";
import { Emoji } from "../Emoji";
import { Box } from "../Box";

export type ErrorViewProps = {
  maxWidth?: number;
  emoji?: string;
  title?: string;
  subheader?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  message?: string;
};

const ErrorView = (props: ErrorViewProps) => {
  const emoji = <Emoji ariaLabel="cry" emoji={props.emoji || "😭"} size={40} />;
  const title =
    props.title !== undefined ? props.title : "Something unexpected happened";
  const subheader =
    props.subheader !== undefined ? props.subheader : "We're sorry about that.";
  const error = props.error;
  const errorInfo = props.errorInfo;
  const maxWidth = props.maxWidth;

  const errorDetail = error ? `${error.stack}` : `No error available`;
  const errorInfoDetail = errorInfo
    ? `ComponentStack: ${errorInfo.componentStack}`
    : `No react errorInfo available`;

  const issueUrl = newGithubIssueUrl({
    user: "opstrace",
    repo: "opstrace",
    labels: ["bug"],
    body: `\n\n\n---\n${errorDetail}\n\n${errorInfoDetail}`
  });

  const defaultContent = (
    <Typography>
      Our bug tracker has got it, but if you like, you can also file a Github
      Issue. We'll include the details of what went wrong for you{" "}
      <Emoji ariaLabel="helpful-nerd" emoji="🤓" />
    </Typography>
  );

  const defaultActions = (
    <CardActions>
      <Button
        variant="contained"
        onClick={() => {
          const win = window.open(issueUrl, "_blank");
          win && win.focus();
        }}
      >
        Open Github Issue
      </Button>
      <Button variant="outlined" onClick={() => window.location.reload(true)}>
        Refresh
      </Button>
    </CardActions>
  );

  const content = props.message ? (
    <Typography>{props.message}</Typography>
  ) : props.children ? (
    props.children
  ) : (
    defaultContent
  );

  return (
    <Box maxWidth={maxWidth}>
      <Card variant="outlined" p={2}>
        <CardHeader avatar={emoji} title={title} subheader={subheader} />
        <CardContent>{content}</CardContent>
        <Box p={1}>
          {props.actions !== undefined ? props.actions : defaultActions}
        </Box>
      </Card>
    </Box>
  );
};

export default ErrorView;
