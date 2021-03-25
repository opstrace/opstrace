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
import { mapIndexed } from "ramda-adjunct";

import { makeStyles, Theme, createStyles } from "@material-ui/core/styles";
import {
  List,
  ListItemIcon,
  ListItemAvatar,
  Avatar,
  Collapse
} from "@material-ui/core";
import { ButtonListItem, ListItemText } from "client/components/List";

import { ExpandLess, ExpandMore } from "@material-ui/icons";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    avatar: { width: 30, height: 30 },
    nested: {
      paddingLeft: theme.spacing(4)
    }
  })
);

export type PanelItem = {
  id: string;
  icon?: string;
  avatar?: string;
  text: string;
  altText?: string;
  data: any;
  subItems?: PanelItem[];
};

type PanelProps = {
  forceSelected?: number;
  items: PanelItem[];
  onSelect: (
    item: PanelItem,
    index: number,
    subItem?: PanelItem,
    subItemIndex?: number
  ) => void;
  makeSubItems: (item: PanelItem, index: number) => PanelItem[];
};

export const Panel = React.memo((props: PanelProps) => {
  const { forceSelected, items, onSelect, makeSubItems } = props;
  const [currentTab, setCurrentTab] = useState<number>(forceSelected || -1);

  useEffect(() => {
    if (forceSelected !== undefined) setCurrentTab(forceSelected);
  }, [forceSelected]);

  const toggleTab = (item: PanelItem, index: number = -1) => {
    setCurrentTab(index);
    if (onSelect) onSelect(item, index);
  };

  return (
    <List>
      {mapIndexed((item: PanelItem, index) => {
        const enabled = currentTab === index;
        return (
          <React.Fragment key={item.id}>
            <ButtonListItem
              selected={enabled}
              dense
              button
              onClick={() => toggleTab(item, index)}
            >
              <PanelIcon item={item} />
              <ListItemText primary={item.text} />
              {enabled ? <ExpandLess /> : <ExpandMore />}
            </ButtonListItem>
            <Collapse in={enabled} timeout="auto" unmountOnExit>
              <SubItems
                items={item.subItems || makeSubItems(item, index)}
                parent={item}
                onClick={(subItem, subItemIndex) => {
                  onSelect(item, index, subItem, subItemIndex);
                }}
              />
            </Collapse>
          </React.Fragment>
        );
      })(items)}
    </List>
  );
});

type PanelIconProps = {
  item: PanelItem;
  allowNone?: boolean;
};

const PanelIcon = ({ item, allowNone }: PanelIconProps) => {
  const classes = useStyles();
  if (item.icon) {
    const IconComponent = item.icon;
    return (
      <ListItemIcon>
        <IconComponent />
      </ListItemIcon>
    );
  } else if (item.avatar) {
    return (
      <ListItemAvatar>
        <Avatar
          alt={item.altText || item.text}
          className={classes.avatar}
          src={item.avatar}
        />
      </ListItemAvatar>
    );
  } else if (allowNone !== true) {
    return (
      <ListItemAvatar>
        <Avatar alt={item.altText || item.text} className={classes.avatar}>
          {item.text.slice(0, 1).toUpperCase()}
        </Avatar>
      </ListItemAvatar>
    );
  } else {
    return null;
  }
};

type SubItemProps = {
  items: PanelItem[];
  parent: PanelItem;
  onClick: (item: PanelItem, index: number) => void;
};

const SubItems = ({ items, parent, onClick }: SubItemProps) => {
  const classes = useStyles();
  return (
    <List>
      {mapIndexed((item: PanelItem, index) => {
        const enabled = false;
        return (
          <React.Fragment key={`${parent.id}-${item.id}`}>
            <ButtonListItem
              selected={enabled}
              dense
              button
              className={classes.nested}
              onClick={() => onClick(item, index)}
            >
              <PanelIcon item={item} allowNone={true} />
              <ListItemText primary={item.text} />
            </ButtonListItem>
          </React.Fragment>
        );
      })(items)}
    </List>
  );
};
