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
import { keys } from "ramda";
import { isTruthy, isArray, isObj } from "ramda-adjunct";

type CondRenderProps = {
  when?: boolean;
  unless?: boolean;
  present?: any;
  render?: Function;
  content?: string | number;
  children?: React.ReactElement | React.ReactElement[];
};

export const CondRender = (props: CondRenderProps) => {
  let shouldRender: boolean = false;

  if (props.when === true || props.unless === false) shouldRender = true;
  else if (props.present !== undefined && isTruthy(props.present)) {
    if (isArray(props.present) && props.present.length > 0) shouldRender = true;
    else if (isObj(props.present) && keys(props.present).length > 0)
      shouldRender = true;
    else shouldRender = true;
  }

  if (shouldRender) {
    if (props.content) return props.content;
    if (props.render) return props.render();
    else if (props.children)
      return <React.Fragment>{props.children}</React.Fragment>;
    else return null;
  } else return null;
};
