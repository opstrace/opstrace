import React from "react";
import { VariableSizeList, areEqual } from "react-window";
import AutoSizer, { Size } from "react-virtualized-auto-sizer";
import { Scrollable } from "../Scrollable";

export type VirtualListRenderItemProps = {
  data: any;
  index: number;
};
export type ItemRenderer = (props: VirtualListRenderItemProps) => JSX.Element;
export type VirtualListProps = {
  height?: number;
  width?: number;
  items: any[];
  itemSize: (index: number) => number;
  renderItem: ItemRenderer;
};

const ScrollableWithRef = React.forwardRef((props, ref) => (
  <Scrollable forwardedRef={ref} {...props} />
));

const Render = (
  renderItem: (props: VirtualListRenderItemProps) => JSX.Element
) =>
  React.memo((props: any) => {
    return (
      <div style={props.style} key={`vl-${props.index}`}>
        {renderItem({ index: props.index, data: props.data[props.index] })}
      </div>
    );
  }, areEqual);

function VirtualList({
  items,
  itemSize,
  renderItem,
  ...props
}: VirtualListProps) {
  const listRef = React.createRef();
  const outerRef = React.createRef();
  const renderer = Render(renderItem);

  return (
    <AutoSizer
      defaultHeight={props.height}
      defaultWidth={props.width}
      disableHeight={Boolean(props.height)}
      disableWidth={Boolean(props.width)}
    >
      {({ height, width }: Size) => {
        return (
          <VariableSizeList
            height={height || props.height || 500}
            width={width}
            itemCount={items.length}
            itemData={items}
            itemSize={itemSize}
            outerRef={outerRef}
            innerRef={listRef}
            outerElementType={ScrollableWithRef}
          >
            {renderer}
          </VariableSizeList>
        );
      }}
    </AutoSizer>
  );
}

export default React.memo(VirtualList);
