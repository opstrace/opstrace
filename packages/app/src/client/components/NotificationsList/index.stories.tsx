import React from "react";
import { radios } from "@storybook/addon-knobs";
import NotificationsList from "./NotificationsList";
import NotificationItem from "./NotificationItem";

export default {
  title: "Components/NotificationsList"
};

export const Default = (): JSX.Element => {
  return (
    <NotificationsList
      isOpen
      items={[
        {
          id: "1",
          information: "Text",
          title: "Title",
          handleClose: () => null
        },
        {
          id: "2",
          information: "Some error",
          title: "Title with error",
          state: "error",
          handleClose: () => null,
          actions: [{
            name: "My action 1",
            handler: () => alert("executed action 1")
          }, {
            name: "My action 2",
            handler: () => alert("executed action 1")
          }]
        }
      ]}
    />
  );
};

export const Notification = (): JSX.Element => {
  const state = radios(
    "state",
    {
      success: "success",
      error: "error",
      warning: "warning",
      info: "info"
    },
    "info",
    "STATE"
  );

  return (
    <NotificationItem
      state={state}
      title="Notification title"
      handleClose={() => null}
    >
      Test notification
    </NotificationItem>
  );
};