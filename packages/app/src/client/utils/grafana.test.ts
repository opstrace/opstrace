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
import nock from "nock";
import { Integration } from "state/integration/types";
import { Tenant } from "state/tenant/types";
import { deleteFolder } from "./grafana";

const getMockIntegration = (): Integration => ({
  id: 1,
  tenant_id: 2,
  name: "mock-integration",
  key: "some-key",
  kind: "some-kind",
  data: {},
  created_at: "today",
  updated_at: "tomorrow"
});

const getMockTenant = (): Tenant => ({
  id: 4,
  name: "mock-tenant",
  key: "some-key",
  type: "some-type",
  created_at: "today",
  updated_at: "tomorrow"
});

beforeEach(() => {
  nock.cleanAll();
});

describe("deleteFolder", () => {
  it("sends correct request", async () => {
    const integration = getMockIntegration();
    const tenant = getMockTenant();
    const folderId = 99;
    
    nock(`http://${tenant.name}.localhost`)
      .delete(`/grafana/api/folders/i9n-${integration.id}`)
      .reply(200, { id: folderId });

    const result = await deleteFolder({
      integration,
      tenant
    });

    expect(result).toEqual({ id: folderId });
  });
});
