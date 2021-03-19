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

import React from "react";

type CondRenderProps = {
  when?: boolean;
  unless?: boolean;
  render?: Function;
  content?: string | number;
  children?: React.ReactNode;
};

export const CondRender = (props: CondRenderProps) => {
  let shouldRender: boolean = false;

  if (props.when === true || props.unless === false) shouldRender = true;

  if (shouldRender) {
    if (props.content) return props.content;
    if (props.render) return props.render();
    else if (props.children)
      return <React.Fragment>{props.children}</React.Fragment>;
    else return null;
  } else return null;
};
