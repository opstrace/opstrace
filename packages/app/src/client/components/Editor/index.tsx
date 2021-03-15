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
import { AsyncComponent } from "../Loadable";
import type { ModuleEditorProps, YamlEditorProps } from "./lib/types";
import EditorSkeleton from "./lib/components/EditorSkeleton";

export { default as EditorSkeleton } from "./lib/components/EditorSkeleton";

export const ModuleEditor = AsyncComponent<ModuleEditorProps>(
  /* #__LOADABLE__ */ () =>
    import(/* webpackChunkName: "module-editor" */ "./editors/ModuleEditor"),
  false,
  <EditorSkeleton />
);

export const ModuleEditorGroup = AsyncComponent<{}>(
  /* #__LOADABLE__ */ () =>
    import(
      /* webpackChunkName: "module-editor-group" */ "./editors/EditorGroup"
    ),
  false,
  <EditorSkeleton />
);

export const YamlEditor = AsyncComponent<YamlEditorProps>(
  /* #__LOADABLE__ */ () =>
    import(/* webpackChunkName: "yaml-editor" */ "./editors/YamlEditor"),
  false,
  <EditorSkeleton />
);
