import React from "react";
import styled, { css } from "styled-components";
import { lighten, darken } from "polished";
import Scrollbar from "react-scrollbars-custom";
import { ITheme } from "client/themes";

const Container = styled(Scrollbar)``;

const BaseScroller = styled.div``;

const baseTrack = css`
  border-radius: 0px !important;
  background: none !important;
`;

const BaseTrackX = styled.div`
  ${baseTrack}
  left: 0px !important;
  width: 100% !important;
`;

const BaseTrackY = styled.div`
  ${baseTrack}
  top: 0px !important;
  height: 100% !important;
`;

const baseThumb = css`
  border-radius: 0px !important;
`;

const getThumbColor = (theme: ITheme) =>
  theme.palette.type === "dark"
    ? lighten(".2", theme.palette.background.default)
    : darken(".2", theme.palette.background.default);

const BaseThumbX = styled.div`
  ${baseThumb}
  background-color: ${props => getThumbColor(props.theme)} !important;
`;

const BaseThumbY = styled.div`
  ${baseThumb}
  background-color: ${props => getThumbColor(props.theme)} !important;
`;

const BaseWrapper = styled.div``;

type ScrollableProps = {
  TrackX?: React.ElementType;
  TrackY?: React.ElementType;
  ThumbX?: React.ElementType;
  ThumbY?: React.ElementType;
  Wrapper?: React.ElementType;
  Scroller?: React.ElementType;
  children?: React.ReactNode;
  onScroll?: (e: any) => void;
  forwardedRef?: any;
  style?: React.CSSProperties;
};

export const Scrollable: React.FC<ScrollableProps> = ({
  TrackX = BaseTrackX,
  TrackY = BaseTrackY,
  ThumbX = BaseThumbX,
  ThumbY = BaseThumbY,
  Wrapper = BaseWrapper,
  Scroller = BaseScroller,
  forwardedRef,
  onScroll,
  ...props
}) => (
  <Container
    {...props}
    trackXProps={{
      renderer: ({ elementRef, ...itemProps }) => (
        <TrackX ref={elementRef} {...itemProps} />
      )
    }}
    trackYProps={{
      renderer: ({ elementRef, ...itemProps }) => (
        <TrackY ref={elementRef} {...itemProps} />
      )
    }}
    thumbXProps={{
      renderer: ({ elementRef, ...itemProps }) => (
        <ThumbX ref={elementRef} {...itemProps} />
      )
    }}
    thumbYProps={{
      renderer: ({ elementRef, ...itemProps }) => (
        <ThumbY ref={elementRef} {...itemProps} />
      )
    }}
    wrapperProps={{
      renderer: ({ elementRef, ...itemProps }) => (
        <Wrapper ref={elementRef} {...itemProps} />
      )
    }}
    scrollerProps={{
      renderer: ({ elementRef, onScroll: rscOnScroll, ...itemProps }) => (
        <Scroller
          {...itemProps}
          onScroll={(e: any) => {
            if (onScroll) {
              onScroll(e);
            }
            if (rscOnScroll) {
              rscOnScroll(e);
            }
          }}
          ref={(ref: any) => {
            if (forwardedRef) {
              forwardedRef(ref);
            }
            if (elementRef) {
              elementRef(ref);
            }
          }}
        />
      )
    }}
  />
);

export default React.memo(Scrollable);
