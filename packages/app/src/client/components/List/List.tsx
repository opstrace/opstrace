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
import {
  VariableSizeList,
  areEqual,
  ListChildComponentProps
} from "react-window";
import AutoSizer, { Size } from "react-virtualized-auto-sizer";
import { Scrollable } from "../Scrollable";

export type VirtualListRenderItemProps<Item> = {
  data: Item;
  index: number;
};
export type ItemRenderer<Item> = (
  props: VirtualListRenderItemProps<Item>
) => JSX.Element;
export type VirtualListProps<Item> = {
  height?: number;
  width?: number;
  items: Item[];
  itemSize: (index: number) => number;
  renderItem: ItemRenderer<Item>;
};

const ScrollableWithRef = React.forwardRef<HTMLDivElement>((props, ref) => (
  <Scrollable forwardedRef={ref} {...props} />
));

const Render = <Item,>(
  renderItem: (props: VirtualListRenderItemProps<Item>) => JSX.Element
) =>
  React.memo((props: ListChildComponentProps) => {
    return (
      <div style={props.style} key={`vl-${props.index}`}>
        {renderItem({ index: props.index, data: props.data[props.index] })}
      </div>
    );
  }, areEqual);

function VirtualList<Item>({
  items,
  itemSize,
  renderItem,
  ...props
}: VirtualListProps<Item>) {
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

const MemoList = React.memo(VirtualList) as typeof VirtualList;

export default MemoList;
