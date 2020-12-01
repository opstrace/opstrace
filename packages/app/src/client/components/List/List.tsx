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
