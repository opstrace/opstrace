/**
 * Copyright 2019-2021 Opstrace, Inc.
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
import AsyncLoadable, { DefaultComponent } from "@loadable/component";

import { ErrorBoundary } from "../Error";
import Loading from "./Loading";

export type LoadableProps<Props> = () => Promise<DefaultComponent<Props>>;

function Loadable<ComponentProps>(
  loader: LoadableProps<ComponentProps>,
  ssr?: boolean,
  fallback?: React.ReactNode
) {
  const AsyncComponent = AsyncLoadable<ComponentProps>(loader, {
    fallback: fallback ? <>{fallback}</> : <Loading />,
    ssr: ssr !== undefined ? ssr : true
  });

  // Return a wrapper that captures the expected props and passes them through
  // to the async component
  return (props: ComponentProps) => (
    <ErrorBoundary>
      <AsyncComponent {...props} />
    </ErrorBoundary>
  );
}

export default Loadable;
