import React from "react";
import styled from "styled-components";

export type EmojiProps = {
  ariaLabel: string;
  emoji: string;
  size?: number;
};

type SpanProps = {
  "aria-label": string;
  role: string;
  size?: number;
};

const Wrapper = styled.span<SpanProps>(props => ({
  fontSize: props.size ? `${props.size}px` : "inherit"
}));

const Emoji = ({ emoji, ariaLabel, size }: EmojiProps) => (
  <Wrapper aria-label={ariaLabel} role="img" size={size}>
    {emoji}
  </Wrapper>
);

export default Emoji;
