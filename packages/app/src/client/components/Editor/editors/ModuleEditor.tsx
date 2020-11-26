import React, { useCallback, useEffect, useState } from "react";
import AutoSizer, { Size } from "react-virtualized-auto-sizer";

import EditorSkeleton from "../lib/components/EditorSkeleton";
import { ModuleEditorProps } from "../lib/types";
import { GlobalEditorCSS } from "../lib/themes";

function AutoSizingEditor(props: ModuleEditorProps) {
  return (
    <AutoSizer>
      {({ height, width }: Size) => {
        return <ModuleEditor {...props} height={height} width={width} />;
      }}
    </AutoSizer>
  );
}

type ResizableModuleEditorProps = ModuleEditorProps & {
  height: number;
  width: number;
};

function ModuleEditor({
  textFileModel,
  height,
  width
}: ResizableModuleEditorProps) {
  const [ready, setReady] = useState(false);
  const editorContainer = useCallback(
    async node => {
      if (node && textFileModel) {
        await textFileModel.render(node);
        setReady(true);
      }
    },
    [textFileModel]
  );

  useEffect(() => {
    if (width !== undefined && height !== undefined && textFileModel) {
      textFileModel.updateEditorLayout({ width, height });
    }
  }, [width, height, textFileModel]);

  return (
    <>
      <GlobalEditorCSS />
      <div
        ref={editorContainer}
        style={{
          height,
          width,
          opacity: ready ? 1 : 0
        }}
      />
      {ready ? null : <EditorSkeleton />}
    </>
  );
}

export default React.memo(AutoSizingEditor);
