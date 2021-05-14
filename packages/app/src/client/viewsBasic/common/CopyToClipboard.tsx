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

import React, { useState, useEffect } from "react";
import copyToClipboard from "copy-to-clipboard";

import AssignmentIcon from "@material-ui/icons/Assignment";
import AssignmentTurnedInIcon from "@material-ui/icons/AssignmentTurnedIn";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles(theme => ({
  copyToClipboard: {
    cursor: "pointer"
  }
}));

export const CopyToClipboardBtn = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const classes = useStyles();

  const clickHandler = () => {
    copyToClipboard(text);
    setCopied(true);
  };

  useEffect(() => {
    if (!copied) return;

    const timer = setTimeout(() => {
      setCopied(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [copied, setCopied]);

  return copied ? (
    <AssignmentTurnedInIcon fontSize="small" />
  ) : (
    <AssignmentIcon
      fontSize="small"
      onClick={clickHandler}
      className={classes.copyToClipboard}
    />
  );
};
