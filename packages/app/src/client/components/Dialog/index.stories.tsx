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
import { makeStyles } from "@material-ui/core/styles";
import Avatar from "@material-ui/core/Avatar";

import PersonIcon from "@material-ui/icons/Person";
import { blue } from "@material-ui/core/colors";

import List from "../List/List";
import { ButtonListItem } from "../List/ListItem";
import { ListItemAvatar } from "../List/ListItemAvatar";
import { ListItemText } from "../List/ListItemText";

import { Button } from "../Button";
import { Typography } from "../Typography";
import DialogTitle from "./DialogTitle";
import Dialog from "./Dialog";
import Box from "../Box/Box";

export default {
  title: "Components/Dialog"
} as Meta;

export const Default = (): JSX.Element => {
  const [open, setOpen] = React.useState(false);
  const [selectedValue, setSelectedValue] = React.useState(emails[1]);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = (value: string) => {
    setOpen(false);
    setSelectedValue(value);
  };

  return (
    <div>
      <Typography variant="subtitle1">Selected: {selectedValue}</Typography>
      <br />
      <Button variant="outlined" color="primary" onClick={handleClickOpen}>
        Open simple dialog
      </Button>
      <SimpleDialog
        selectedValue={selectedValue}
        open={open}
        onClose={handleClose}
      />
    </div>
  );
};

const emails = new Array(100).fill("username@gmail.com").map((v, i) => i + v);
const useStyles = makeStyles({
  avatar: {
    backgroundColor: blue[100],
    color: blue[600]
  }
});

export interface SimpleDialogProps {
  open: boolean;
  selectedValue: string;
  onClose: (value: string) => void;
}

function SimpleDialog(props: SimpleDialogProps) {
  const classes = useStyles();
  const { onClose, selectedValue, open } = props;

  const handleClose = () => {
    onClose(selectedValue);
  };

  const handleListItemClick = (value: string) => {
    onClose(value);
  };

  const renderItem = ({ index, data }: { index: number; data: string }) => {
    return (
      <ButtonListItem onClick={() => handleListItemClick(data)} key={data}>
        <ListItemAvatar>
          <Avatar className={classes.avatar}>
            <PersonIcon />
          </Avatar>
        </ListItemAvatar>
        <ListItemText primary={data} />
      </ButtonListItem>
    );
  };

  return (
    <Dialog
      onClose={handleClose}
      aria-labelledby="simple-dialog-title"
      open={open}
    >
      <DialogTitle id="simple-dialog-title">Select account</DialogTitle>
      <Box width={300} height={500}>
        <List renderItem={renderItem} items={emails} itemSize={() => 50} />
      </Box>
    </Dialog>
  );
}
