import React from "react";
import { useDispatch, useSelector } from "react-redux";

import { renderHook } from "@testing-library/react-hooks";
import { StoreProvider } from "state/provider";
import getSubscriptionID from "state/utils/getSubscriptionID";

import useCurrentUser from "../useCurrentUser";
import { subscribe } from "../../actions";

jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux") as object,
  useDispatch: jest.fn(),
  useSelector: jest.fn()
}));

jest.mock("state/utils/getSubscriptionID");

afterEach(() => {
  jest.clearAllMocks();
});

test("useCurrentUser hook", () => {
  const user = {
    currentUser: {
      email: "email@email.com",
      preference: {
        dark_mode: true
      }
    }
  };

  const dispatchMock = jest.fn();

  (useSelector as jest.Mock).mockReturnValueOnce(user);
  (useDispatch as jest.Mock).mockReturnValueOnce(dispatchMock);
  (getSubscriptionID as jest.Mock).mockReturnValueOnce(1);

  const { result } = renderHook(() => useCurrentUser(), {
    wrapper: ({ children }: any) => <StoreProvider>{children}</StoreProvider>
  });

  expect(dispatchMock).toHaveBeenCalledWith(subscribe({ id: 1, email: "foobar"}));
  expect(result.current).toEqual(user);
});