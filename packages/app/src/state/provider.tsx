import React, { useRef } from "react";
import { Provider } from "react-redux";
import createMainStore from "./store";

// re-export these, but can also use directly from "react-redux"
export { useSelector, useDispatch } from "react-redux";
// re-export State type for convenience
export type { State } from "./reducer";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const store = useRef(createMainStore());

  return <Provider store={store.current}>{children}</Provider>;
}
