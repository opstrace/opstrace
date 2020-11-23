import React from "react";
import { useDispatch, useSelector } from "react-redux";

import { renderHook } from "@testing-library/react-hooks";
import { StoreProvider } from "state/provider";
import getSubscriptionID from "state/utils/getSubscriptionID";

import useCurrentUser, {
  getCurrentUser,
  getCurrentUserLoaded
} from "../useCurrentUser";
import { subscribe } from "../../actions";
import { mainReducer } from "state/reducer";
import { CombinedState } from "redux";

jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux") as object,
  useDispatch: jest.fn(),
  useSelector: jest.fn()
}));

jest.mock("state/utils/getSubscriptionID");

afterEach(() => {
  jest.clearAllMocks();
});

const mockAction = { type: "UNKNOWN_ACTION" } as any;

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

  expect(dispatchMock).toHaveBeenCalledWith(subscribe(1));
  expect(result.current).toEqual(user);
});

test("getCurrentUser selector", () => {
  const subState = {
    users: {
      currentUser: {
        username: "Test",
        email: "email@test.com",
      }
    },
  };
  const state = mainReducer(subState as CombinedState<any>, mockAction);
  expect(getCurrentUser(state)).toEqual({
    username: "Test",
    email: "email@test.com",
  });
});

test("getCurrentUserLoaded selector", () => {
  const subState = {
    users: {
      currentUserLoaded: true,
      currentUser: {
        username: "Test"
      }
    },
  };

  const state = mainReducer(subState as CombinedState<any>, mockAction);
  expect(getCurrentUserLoaded(state)).toBeTruthy();
});