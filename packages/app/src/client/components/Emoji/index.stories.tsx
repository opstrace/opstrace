import React from "react";

import Emoji from "./Emoji";

export default {
  title: "Components/Emoji"
};

export const Default = (): JSX.Element => {
  return (
    <div>
      <Emoji ariaLabel="joy" emoji="😂" size={50} />
      <br />
      <Emoji ariaLabel="scream" emoji="😱" />
    </div>
  );
};
