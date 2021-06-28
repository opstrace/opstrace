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
import { useLastSelectedTenant } from "./useTenant";
import { useSelector } from "state/provider";
import { renderHook } from "@testing-library/react-hooks";
import { Router } from "react-router";
import { createMemoryHistory } from "history";

jest.mock("./useTenantList");
jest.mock("state/provider");

describe("useLastSelectedTenant", () => {
  it("returns `undefined` if no tenant has been selected", () => {
    const history = createMemoryHistory({
      initialEntries: [`/no/tenant/selected`]
    });

    const wrapper = (props: { children: React.ReactNode }) => (
      <Router history={history}>{props.children}</Router>
    );
    const mockState = {
      tenants: {
        loading: false,
        tenants: {}
      }
    };

    // @ts-expect-error mock
    useSelector.mockImplementation(cb => cb(mockState));
    const { result } = renderHook(() => useLastSelectedTenant(), { wrapper });
    expect(result.current).toBe(undefined);
  });

  it("returns currently selected tenant", () => {
    const mockTenant = {
      name: "my-tenant",
      type: "my-tenant-type",
      created_at: "",
      updated_at: "",
      id: "",
      key: ""
    };

    const history = createMemoryHistory({
      initialEntries: [`/tenant/${mockTenant.name}`]
    });

    const wrapper = (props: { children: React.ReactNode }) => (
      <Router history={history}>{props.children}</Router>
    );

    const mockState = {
      tenants: {
        loading: false,
        tenants: {
          [mockTenant.name]: mockTenant
        }
      }
    };

    // @ts-expect-error mock
    useSelector.mockImplementation(cb => cb(mockState));
    const { result } = renderHook(() => useLastSelectedTenant(), { wrapper });
    expect(result.current).toEqual(mockTenant);
  });

  it("updates value to last selected tenant", async () => {
    const firstTenant = {
      name: "first-tenant",
      type: "first-tenant-type",
      created_at: "",
      updated_at: "",
      id: "",
      key: ""
    };
    const secondTenant = {
      name: "second-tenant",
      type: "second-tenant-type",
      created_at: "",
      updated_at: "",
      id: "",
      key: ""
    };

    const history = createMemoryHistory({
      initialEntries: [`/tenant/${firstTenant.name}`]
    });

    const wrapper = (props: { children: React.ReactNode }) => (
      <Router history={history}>{props.children}</Router>
    );

    const mockState = {
      tenants: {
        loading: false,
        tenants: {
          [firstTenant.name]: firstTenant,
          [secondTenant.name]: secondTenant
        }
      }
    };

    // @ts-expect-error mock
    useSelector.mockImplementation(cb => cb(mockState));

    const { result, waitForNextUpdate } = renderHook(() => useLastSelectedTenant(), { wrapper });
    expect(result.current).toEqual(firstTenant);

    history.push(`/tenant/${secondTenant.name}`);
    await waitForNextUpdate()
    expect(result.current).toEqual(secondTenant);
  });

  it("returns previous selected tenant if currently undefined", async () => {
    const firstTenant = {
      name: "first-tenant",
      type: "first-tenant-type",
      created_at: "",
      updated_at: "",
      id: "",
      key: ""
    };
    const secondTenant = {
      name: "second-tenant",
      type: "second-tenant-type",
      created_at: "",
      updated_at: "",
      id: "",
      key: ""
    };

    const history = createMemoryHistory({
      initialEntries: [`/tenant/${firstTenant.name}`]
    });

    const wrapper = (props: { children: React.ReactNode }) => (
      <Router history={history}>{props.children}</Router>
    );

    const mockState = {
      tenants: {
        loading: false,
        tenants: {
          [firstTenant.name]: firstTenant,
          [secondTenant.name]: secondTenant
        }
      }
    };

    // @ts-expect-error mock
    useSelector.mockImplementation(cb => cb(mockState));

    const { result, waitForNextUpdate } = renderHook(() => useLastSelectedTenant(), { wrapper });
    expect(result.current).toEqual(firstTenant);

    history.push("/no/tenant");
    expect(result.current).toEqual(firstTenant);

    history.push(`/tenant/${secondTenant.name}`);
    await waitForNextUpdate()
    expect(result.current).toEqual(secondTenant);

    // did not contain undefined
    expect(result.all).not.toEqual(
      expect.arrayContaining([undefined]),
    );
  })
});
