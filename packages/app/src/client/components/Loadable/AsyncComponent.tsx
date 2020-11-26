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
